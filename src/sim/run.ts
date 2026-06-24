import { createWorld, type Entity, type World } from "koota";
import { config } from "@/config";
import { allEvents } from "@/content/events";
import type { Rng } from "@/core/rng";
import type { Effect, TrailEvent } from "@/schemas/event";
import type { Hazard } from "@/schemas/hazard";
import type { TradeOffer } from "@/schemas/outpost";
import { abilityBlock, abilityForCrew, cooldownRemaining, resolveAbility } from "@/sim/abilities";
import {
  applyInjury,
  type EvaSession,
  drill as evaDrill,
  endEva as evaEnd,
  scan as evaScan,
  startEva as evaStart,
  type ScanHeat,
} from "@/sim/eva";
import { applyEffects } from "@/sim/event";
import type { Loadout } from "@/sim/factories";
import { spawnExpedition } from "@/sim/factories";
import { type HazardResult, resolveHazard } from "@/sim/hazard";
import { type OutpostStop, resolveRest, resolveTrade, serviceForOutpost } from "@/sim/outpost";
import { SECONDS_PER_SOL, step } from "@/sim/tick";
import {
  AbilityCooldowns,
  Crew,
  MaxResources,
  Outcome,
  Position,
  Resources,
  RngSource,
  SolClock,
  Sponsor,
  Travel,
  Weather,
} from "@/sim/traits";
import { bumpShake, getDiagnostics, resetDiagnostics } from "@/state/diagnostics";

/**
 * Run controller — owns the koota world + the expedition entity for one run, ticks
 * the sim on the fixed-timestep engine loop, and publishes per-frame state to the
 * diagnostics bridge (which the R3F scenes read in useFrame). The UI reads live
 * expedition state via snapshot(); per-frame data never round-trips through React.
 */
export interface RunSnapshot {
  sol: number;
  distance: number;
  goal: number;
  resources: ReturnType<Entity["get"]>;
  crew: {
    id: string;
    alive: boolean;
    condition: string;
    /** Display name from the crew config. */
    name: string;
    /** Role from the crew config (Commander / Engineer / Geologist / Botanist). */
    role: string;
    /** This member's active ability + whether it's currently usable. */
    ability: {
      id: string;
      name: string;
      desc: string;
      /** null = usable; otherwise why it's blocked (dead/cooldown/afford). */
      blocked: "dead" | "cooldown" | "afford" | null;
      /** Sols left on the cooldown (0 = ready). */
      cooldown: number;
    } | null;
  }[];
  outcome: "running" | "won" | "lost";
  reason: string;
  score: number;
  driving: boolean;
  pace: string;
  rationLevel: string;
  /** The trail event awaiting a player decision, or null. While set, the rover is halted. */
  pendingEvent: TrailEvent | null;
  /** The hazard traverse awaiting a decision, or null. While set, the rover is halted. */
  pendingHazard: Hazard | null;
  /** The 0..1 "read" stat for the pending hazard (slope/density/thickness). */
  hazardRead: number;
  /** The last resolved hazard outcome, for the consequence beat; cleared on resume. */
  lastHazardResult: HazardResult | null;
  /** The active EVA session, or null when not on an EVA. */
  eva: EvaSession | null;
  /** The mission sponsor's terminus score multiplier (drives the UNOMA rating breakdown). */
  scoreMultiplier: number;
  /** The outpost the rover is docked at, or null. While set, the rover is halted. */
  pendingOutpost: OutpostStop | null;
}

/** Clamp huge frame gaps (tab backgrounded) so one slow frame can't skip Sols. */
const MAX_TICK_DT = 1 / 4;

class Run {
  private world: World | null = null;
  private entity: Entity | null = null;
  private driving = false;
  /** Sol value at the last event roll, so we only roll once per fresh Sol. */
  private lastEventSol = 1;
  /** Ids already presented this run, so an event never repeats. */
  private seenEvents = new Set<string>();
  /** The event the player must resolve before driving can resume. */
  private pendingEvent: TrailEvent | null = null;
  /**
   * The run's dedicated event stream — forked ONCE at start from the entity's
   * seeded rng. It must persist across ticks: re-forking each tick would reset the
   * stream and re-evaluate the same draw every frame.
   */
  private eventRng: Rng | null = null;

  /** The hazard the player must resolve before driving can resume. */
  private pendingHazard: Hazard | null = null;
  /** The 0..1 read stat the player sees for the pending hazard (deterministic per hazard). */
  private hazardRead = 0;
  /** Ids of hazards already raised this run, so each triggers exactly once. */
  private resolvedHazards = new Set<string>();
  /** The most recent traverse outcome, surfaced for the consequence beat. */
  private lastHazardResult: HazardResult | null = null;
  /** Was the hull in the critical band on the previous publish? (edge-detect for shake.) */
  private hullWasCritical = false;
  /** Dedicated hazard outcome stream, forked once at start. */
  private hazardRng: Rng | null = null;

  /** The active EVA session, or null. Drilling/scanning thread through this. */
  private eva: EvaSession | null = null;
  /** Dedicated EVA stream, forked once at start (re-forked per EVA so each is fresh+seeded). */
  private evaRng: Rng | null = null;
  /** Count of EVAs run, so each forks a distinct sub-stream (eva:0, eva:1, …). */
  private evaCount = 0;
  /**
   * Whether the geologist's "Deep Prospect" ability has primed the NEXT EVA's yield. Drained
   * the moment that EVA's haul is banked (endEva), so it boosts exactly one EVA.
   */
  private evaYieldPrimed = false;

  /** The outpost the rover is currently docked at, or null. While set, the rover is halted. */
  private pendingOutpost: OutpostStop | null = null;
  /** Names of outposts already docked at this run, so each triggers exactly once. */
  private dockedOutposts = new Set<string>();

  /** Begin a fresh run. Resets the diagnostics bridge + spawns the expedition. */
  start(seed: string, loadout?: Loadout): void {
    // koota caps live worlds at 16; destroy the prior run's world so repeated starts
    // (a restart, or a test sweep) never exhaust the allocator.
    this.world?.destroy();
    this.world = createWorld();
    this.entity = spawnExpedition(this.world, seed, loadout);
    this.driving = false;
    this.lastEventSol = this.entity.get(Position)?.sol ?? 1;
    this.seenEvents.clear();
    this.pendingEvent = null;
    this.eventRng = this.entity.get(RngSource)?.fork("events") ?? null;
    this.pendingHazard = null;
    this.hazardRead = 0;
    this.resolvedHazards.clear();
    this.lastHazardResult = null;
    this.hazardRng = this.entity.get(RngSource)?.fork("hazards") ?? null;
    this.eva = null;
    this.evaRng = this.entity.get(RngSource)?.fork("eva") ?? null;
    this.evaCount = 0;
    this.evaYieldPrimed = false;
    this.pendingOutpost = null;
    this.dockedOutposts.clear();
    this.hullWasCritical = false;
    resetDiagnostics();
    this.publish();
  }

  /** Whether a run is active and still going. */
  get active(): boolean {
    return this.entity != null && this.entity.get(Outcome)?.status === "running";
  }

  /** A decision is pending (event, hazard, or outpost dock) — the rover can't drive. */
  private get halted(): boolean {
    return this.pendingEvent != null || this.pendingHazard != null || this.pendingOutpost != null;
  }

  setDriving(on: boolean): void {
    // A pending event/hazard halts the rover; it can't drive until the choice is made.
    this.driving = on && !this.halted;
    getDiagnostics().driving = this.driving && this.active;
  }

  /** Set the travel pace (key into config.travel.pace). Writes the Travel trait. */
  setPace(pace: string): void {
    if (!this.entity || !(pace in config.travel.pace)) return;
    this.entity.set(Travel, { pace });
    this.publish();
  }

  /** Set the ration level (key into config.travel.rations). Writes the Travel trait. */
  setRations(rationLevel: string): void {
    if (!this.entity || !(rationLevel in config.travel.rations)) return;
    this.entity.set(Travel, { rationLevel });
    this.publish();
  }

  /** The trail event awaiting a decision, or null. */
  get currentEvent(): TrailEvent | null {
    return this.pendingEvent;
  }

  /** The hazard awaiting a decision, or null. */
  get currentHazard(): Hazard | null {
    return this.pendingHazard;
  }

  /** The active EVA session, or null. */
  get currentEva(): EvaSession | null {
    return this.eva;
  }

  /**
   * Resolve the pending event: apply the chosen option's effects to Resources and
   * clear the halt so the player can resume driving. No-op if nothing is pending.
   */
  applyEventChoice(effects: readonly Effect[]): void {
    const e = this.entity;
    if (!e || !this.pendingEvent) return;
    const res = e.get(Resources);
    if (res) {
      const maxPower = e.get(MaxResources)?.power ?? config.resources.max.power;
      e.set(Resources, applyEffects(res, effects, maxPower));
    }
    this.pendingEvent = null;
    this.publish();
  }

  /**
   * Resolve the pending hazard via the chosen option. Runs the pure resolver against the
   * hazard rng, applies the resource patch, charges the Sols + distance the attempt cost,
   * and clears the halt. The outcome is stashed in `lastHazardResult` for the UI's
   * consequence beat; `resumeFromHazard` clears it once the player drives on.
   */
  resolveHazard(optionId: string): HazardResult | null {
    const e = this.entity;
    const hazard = this.pendingHazard;
    const rng = this.hazardRng;
    if (!e || !hazard || !rng) return null;

    const res = e.get(Resources);
    if (!res) return null;
    const maxPower = e.get(MaxResources)?.power ?? config.resources.max.power;
    const result = resolveHazard(hazard, optionId, this.hazardRead, res, rng, maxPower);

    e.set(Resources, result.patch);
    const pos = e.get(Position);
    if (pos) {
      e.set(Position, {
        sol: pos.sol + result.solsCost,
        distance: Math.max(0, pos.distance + result.distanceDelta),
      });
      // The traverse banks the elapsed Sols against the event clock too, so no event
      // back-fires for the days the crossing consumed.
      this.lastEventSol = pos.sol + result.solsCost;
    }
    this.resolvedHazards.add(hazard.id);
    this.lastHazardResult = result;
    this.pendingHazard = null;
    // A failed traverse is an impactful beat — knock the camera (render reads + decays it).
    if (result.tier === "fail") bumpShake(1);
    else if (result.tier === "partial") bumpShake(0.45);
    this.publish();
    return result;
  }

  /** Clear the post-traverse consequence and let the player resume driving. */
  resumeFromHazard(): void {
    this.lastHazardResult = null;
    this.publish();
  }

  /**
   * Per-tick check: has the rover reached an un-raised hazard's distance (within the trigger
   * window)? If so, raise it, derive its deterministic read, and halt. Parallels rollEvent.
   */
  rollHazard(): void {
    const e = this.entity;
    const rng = this.hazardRng;
    if (!e || !rng || this.halted) return;
    const distance = e.get(Position)?.distance ?? 0;
    const window = config.hazards.triggerWindow;
    for (const hazard of config.hazards.hazards) {
      if (this.resolvedHazards.has(hazard.id)) continue;
      if (distance >= hazard.distance && distance <= hazard.distance + window) {
        this.pendingHazard = hazard;
        // Derive the read deterministically from the hazard stream so the gauge the player
        // sees is the same value the resolver scales the odds with.
        this.hazardRead = rng.range(0.25, 0.95);
        this.driving = false;
        getDiagnostics().driving = false;
        return;
      }
    }
  }

  /** The outpost the rover is docked at, or null. */
  get currentOutpost(): OutpostStop | null {
    return this.pendingOutpost;
  }

  /**
   * Per-tick check: has the rover reached an un-docked outpost's distance (within the trigger
   * window)? If so, dock — bind the waypoint to its services + lore and halt. Parallels
   * rollHazard. An outpost without configured services is skipped (never blocks the trail).
   */
  rollOutpost(): void {
    const e = this.entity;
    if (!e || this.halted) return;
    const distance = e.get(Position)?.distance ?? 0;
    const window = config.outposts.triggerWindow;
    for (const wp of config.terrain.outposts) {
      if (this.dockedOutposts.has(wp.name)) continue;
      if (distance >= wp.distance && distance <= wp.distance + window) {
        const service = serviceForOutpost(wp.name);
        if (!service) {
          // No services configured — mark it docked so it doesn't re-check, but don't halt.
          this.dockedOutposts.add(wp.name);
          continue;
        }
        this.pendingOutpost = { name: wp.name, distance: wp.distance, service };
        this.driving = false;
        getDiagnostics().driving = false;
        return;
      }
    }
  }

  /**
   * Rest in the habitat: apply the rest effects (heal morale/hull/power, pay vitals upkeep),
   * charge the Sols the stay consumes, and heal non-fatal crew conditions back to healthy.
   * Stays docked afterward (the player still has trade/lore + a "Back on the Trail" action).
   */
  restAtOutpost(): void {
    const e = this.entity;
    const stop = this.pendingOutpost;
    if (!e || !stop) return;
    const res = e.get(Resources);
    if (res) {
      const maxPower = e.get(MaxResources)?.power ?? config.resources.max.power;
      e.set(Resources, resolveRest(stop, res, maxPower));
    }
    const pos = e.get(Position);
    if (pos) {
      e.set(Position, { sol: pos.sol + stop.service.rest.sols });
      // Bank the elapsed Sols against the event clock so the rest doesn't back-fire events.
      this.lastEventSol = pos.sol + stop.service.rest.sols;
    }
    if (stop.service.rest.healsConditions) {
      const crew = e.get(Crew);
      if (crew) {
        for (const c of crew) {
          if (c.alive && c.condition !== "healthy") {
            c.condition = "healthy";
            c.severity = 0;
          }
        }
        e.set(Crew, crew);
      }
    }
    this.publish();
  }

  /** Resolve a resupply trade at the docked outpost, if affordable. No-op otherwise. */
  tradeAtOutpost(offer: TradeOffer): boolean {
    const e = this.entity;
    if (!e || !this.pendingOutpost) return false;
    const res = e.get(Resources);
    if (!res) return false;
    const maxPower = e.get(MaxResources)?.power ?? config.resources.max.power;
    const patch = resolveTrade(offer, res, maxPower);
    if (!patch) return false;
    e.set(Resources, patch);
    this.publish();
    return true;
  }

  /** Undock and let the player resume driving (the "Back on the Trail" action). */
  leaveOutpost(): void {
    if (this.pendingOutpost) this.dockedOutposts.add(this.pendingOutpost.name);
    this.pendingOutpost = null;
    this.publish();
  }

  /**
   * Use a crew member's active ability (M10). Validates alive + off-cooldown + affordable
   * against the live state, applies the resource effects, charges any Sols, stamps the
   * cooldown, and arms the one-shot EVA-yield buff for the geologist's "Deep Prospect".
   * Returns whether the ability fired.
   */
  useAbility(crewId: string): boolean {
    const e = this.entity;
    if (!e) return false;
    const ability = abilityForCrew(crewId);
    if (!ability) return false;
    const res = e.get(Resources);
    if (!res) return false;
    const sol = e.get(Position)?.sol ?? 1;
    const cooldowns = e.get(AbilityCooldowns) ?? {};
    const crew = e.get(Crew)?.find((c) => c.id === crewId);
    if (abilityBlock(ability, crew, res, sol, cooldowns[ability.id]) !== null) return false;

    const maxPower = e.get(MaxResources)?.power ?? config.resources.max.power;
    e.set(Resources, resolveAbility(ability, res, maxPower));
    if (ability.sols > 0) {
      const pos = e.get(Position);
      if (pos) {
        e.set(Position, { sol: pos.sol + ability.sols });
        this.lastEventSol = pos.sol + ability.sols;
      }
    }
    e.set(AbilityCooldowns, { ...cooldowns, [ability.id]: sol });
    if (ability.sets === "evaYieldBonus") this.evaYieldPrimed = true;
    this.publish();
    return true;
  }

  /**
   * Begin an EVA from the halted rover. Forks a fresh seeded sub-stream (so each EVA lays its
   * own deposit field deterministically) and caps the O₂ budget at the rover's O₂. Returns
   * the session, or null if there's no entity / no O₂.
   */
  startEva(): EvaSession | null {
    const e = this.entity;
    const base = this.evaRng;
    if (!e || !base) return null;
    const res = e.get(Resources);
    const available = res?.oxygen ?? 0;
    const sub = base.fork(`eva:${this.evaCount++}`);
    const session = evaStart(sub, available);
    // Charge the suit's O₂ budget OUT of the rover up front; endEva re-pools whatever the
    // EVA didn't burn. This keeps O₂ conserved (the suit air is the rover's air).
    if (res) {
      const maxPower = e.get(MaxResources)?.power ?? config.resources.max.power;
      e.set(Resources, applyEffects(res, [{ target: "oxygen", delta: -session.o2 }], maxPower));
    }
    this.eva = session;
    this.publish();
    return this.eva;
  }

  /** Scan a field cell. Returns the heat reading; mutates the session O₂/reveal state. */
  evaScan(x: number, y: number): ScanHeat {
    if (!this.eva) return "none";
    const { session, heat, injured } = evaScan(this.eva, x, y);
    this.eva = injured ? this.injureCrewOnEva(session) : session;
    this.publish();
    return heat;
  }

  /** Drill a field cell. Returns whether a deposit was hit; banks yield into the session haul. */
  evaDrill(x: number, y: number): boolean {
    if (!this.eva) return false;
    const { session, hit, injured } = evaDrill(this.eva, x, y);
    this.eva = injured ? this.injureCrewOnEva(session) : session;
    this.publish();
    return hit;
  }

  /** Map an EVA injury roll onto a living crew member (the geologist takes point on EVAs). */
  private injureCrewOnEva(session: EvaSession): EvaSession {
    const e = this.entity;
    if (!e || session.injuredCrew) return session;
    const crew = e.get(Crew);
    const victim =
      crew?.find((c) => c.alive && c.condition === "healthy") ?? crew?.find((c) => c.alive);
    if (!victim || !crew) return session;
    victim.condition = "injury";
    victim.severity = 0;
    e.set(Crew, crew);
    return applyInjury(session, victim.id);
  }

  /**
   * End the EVA and bank the haul into rover resources: O₂ already spent leaves the rover with
   * its remaining suit air re-pooled; water/parts are added (clamped to maxima); score + a
   * morale bump land if the haul was worth the trip. Returns the banked session, then clears it.
   */
  endEva(): EvaSession | null {
    const e = this.entity;
    if (!e || !this.eva) return null;
    const ended = evaEnd(this.eva);
    // The geologist's "Deep Prospect" ability primes ONE EVA for a richer haul — scale the
    // banked water/parts/score by the configured bonus, then drain the buff (one EVA only).
    const bonus = this.evaYieldPrimed ? config.abilities.evaYieldBonusMult : 1;
    this.evaYieldPrimed = false;
    const haulWater = Math.round(ended.haul.water * bonus);
    const haulParts = Math.round(ended.haul.parts * bonus);
    const haulScore = Math.round(ended.haul.score * bonus);
    const res = e.get(Resources);
    if (res) {
      const max = config.resources.max;
      const maxPower = e.get(MaxResources)?.power ?? max.power;
      // Re-pool the suit's unused O₂ back into the rover; bank water + parts.
      const patch = applyEffects(
        res,
        [
          { target: "oxygen", delta: ended.o2 },
          { target: "water", delta: haulWater },
          { target: "parts", delta: haulParts },
          {
            target: "morale",
            delta: ended.haul.drills > 0 ? config.eva.haulMoraleBonus : 0,
          },
        ],
        maxPower,
      );
      e.set(Resources, patch);
    }
    // Bank the prospecting score onto the run's score tally.
    const outcome = e.get(Outcome);
    if (outcome) e.set(Outcome, { score: outcome.score + haulScore });
    this.eva = null;
    this.publish();
    return ended;
  }

  /**
   * Advance wall-clock `dt` seconds; ticks the sim only while driving. `step`
   * owns the Sol clock (it banks dt into the SolClock trait and fires a Sol per
   * SECONDS_PER_SOL), so we hand it the raw clamped frame delta directly — the
   * engine `advance()` accumulator is for fixed-step sub-systems, not this.
   */
  tick(dt: number): void {
    if (!this.world || !this.entity) return;
    if (this.driving && this.active && !this.halted) {
      step(this.world, Math.min(Math.max(0, dt), MAX_TICK_DT));
      // A hazard on the road takes precedence over an outpost dock and a random event the
      // same tick; an outpost dock takes precedence over a random event.
      this.rollHazard();
      if (!this.halted) this.rollOutpost();
      if (!this.halted) this.rollEvent();
    }
    this.publish();
  }

  /**
   * Per fresh Sol, roll the active pace's eventChance against the entity's seeded
   * rng (forked into an isolated "events" stream). On a hit, pick an unseen event
   * and halt the rover — the UI surfaces the modal and resumes after the choice.
   */
  private rollEvent(): void {
    const e = this.entity;
    const events = this.eventRng;
    if (!e || !events || this.halted) return;
    const sol = e.get(Position)?.sol ?? this.lastEventSol;
    if (sol <= this.lastEventSol) return;

    // Catch up across every Sol elapsed this tick (a slow frame can bank several).
    // The stream persists across ticks, so each Sol consumes exactly one draw.
    for (let s = this.lastEventSol + 1; s <= sol; s++) {
      const paceKey = e.get(Travel)?.pace ?? "steady";
      const chance = config.travel.pace[paceKey]?.eventChance ?? 0;
      if (events.chance(chance)) {
        const picked = this.pickEvent(events);
        if (picked) {
          this.pendingEvent = picked;
          this.seenEvents.add(picked.id);
          this.driving = false;
          getDiagnostics().driving = false;
          this.lastEventSol = s;
          return;
        }
      }
    }
    this.lastEventSol = sol;
  }

  /** Pick an unseen event uniformly, or null once the registry is exhausted. */
  private pickEvent(rng: Rng): TrailEvent | null {
    const pool = allEvents().filter((ev) => !this.seenEvents.has(ev.id));
    if (pool.length === 0) return null;
    return rng.pick(pool);
  }

  /** Mirror the entity's authoritative state into the frame-cadence bridge. */
  private publish(): void {
    const e = this.entity;
    if (!e) return;
    const d = getDiagnostics();
    const pos = e.get(Position);
    const res = e.get(Resources);
    const max = config.resources.max;
    d.distance = pos?.distance ?? 0;
    d.sol = pos?.sol ?? 1;
    d.driving = this.driving && this.active && !this.halted;
    // Day phase 0..1 rides the Sol-clock accumulator so the sky lerps over each Sol.
    const acc = e.get(SolClock)?.accumulator ?? 0;
    d.dayCycle = Math.min(1, Math.max(0, acc / SECONDS_PER_SOL));
    // Weather drives the dust-storm overlay; the storm state is the sim's authority.
    d.weather = e.get(Weather)?.kind === "dust_storm" ? "dust_storm" : "clear";
    const maxRes = e.get(MaxResources);
    d.hull = res ? res.hull / (maxRes?.hull ?? max.hull) : 1;
    d.power = res ? res.power / Math.max(1, maxRes?.power ?? max.power) : 1;
    d.critical = res ? res.oxygen <= 0 || res.hull <= 0 || res.morale <= 10 : false;
    // Hull entering the critical band is an impactful beat — bump the camera shake once on the
    // edge (not every frame it stays low). 15% of max hull is the "structural failure" line.
    const hullCritical = d.hull <= 0.15;
    if (hullCritical && !this.hullWasCritical) bumpShake(0.7);
    this.hullWasCritical = hullCritical;
  }

  /** A UI-cadence snapshot of the run (call from React effects/handlers, not per-frame). */
  snapshot(): RunSnapshot | null {
    const e = this.entity;
    if (!e) return null;
    const pos = e.get(Position);
    const travel = e.get(Travel);
    const outcome = e.get(Outcome);
    const res = e.get(Resources);
    const sol = pos?.sol ?? 1;
    const cooldowns = e.get(AbilityCooldowns) ?? {};
    const roster = config.crew.roster;
    const crew = (e.get(Crew) ?? []).map((c) => {
      const member = roster.find((m) => m.id === c.id);
      const ability = abilityForCrew(c.id);
      const lastUsed = ability ? cooldowns[ability.id] : undefined;
      return {
        id: c.id,
        alive: c.alive,
        condition: c.condition,
        name: member?.name ?? c.id,
        role: member?.role ?? "",
        ability:
          ability && res
            ? {
                id: ability.id,
                name: ability.name,
                desc: ability.desc,
                blocked: abilityBlock(ability, c, res, sol, lastUsed),
                cooldown: cooldownRemaining(ability, sol, lastUsed),
              }
            : null,
      };
    });
    return {
      sol: pos?.sol ?? 1,
      distance: pos?.distance ?? 0,
      goal: config.travel.totalDistance,
      resources: res,
      crew,
      outcome: (outcome?.status ?? "running") as RunSnapshot["outcome"],
      reason: outcome?.reason ?? "",
      score: outcome?.score ?? 0,
      driving: this.driving,
      pace: travel?.pace ?? "steady",
      rationLevel: travel?.rationLevel ?? "filling",
      pendingEvent: this.pendingEvent,
      pendingHazard: this.pendingHazard,
      hazardRead: this.hazardRead,
      lastHazardResult: this.lastHazardResult,
      eva: this.eva,
      scoreMultiplier: e.get(Sponsor)?.scoreMultiplier ?? 1,
      pendingOutpost: this.pendingOutpost,
    };
  }
}

export const run = new Run();
