import { createWorld, type Entity, type World } from "koota";
import { config } from "@/config";
import { allEvents } from "@/content/events";
import type { Rng } from "@/core/rng";
import type { Effect, TrailEvent } from "@/schemas/event";
import type { Hazard } from "@/schemas/hazard";
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
import { step } from "@/sim/tick";
import { Crew, MaxResources, Outcome, Position, Resources, RngSource, Travel } from "@/sim/traits";
import { getDiagnostics, resetDiagnostics } from "@/state/diagnostics";

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
  crew: { id: string; alive: boolean; condition: string }[];
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
  /** Dedicated hazard outcome stream, forked once at start. */
  private hazardRng: Rng | null = null;

  /** The active EVA session, or null. Drilling/scanning thread through this. */
  private eva: EvaSession | null = null;
  /** Dedicated EVA stream, forked once at start (re-forked per EVA so each is fresh+seeded). */
  private evaRng: Rng | null = null;
  /** Count of EVAs run, so each forks a distinct sub-stream (eva:0, eva:1, …). */
  private evaCount = 0;

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
    resetDiagnostics();
    this.publish();
  }

  /** Whether a run is active and still going. */
  get active(): boolean {
    return this.entity != null && this.entity.get(Outcome)?.status === "running";
  }

  /** A decision is pending (event or hazard) — the rover can't drive. */
  private get halted(): boolean {
    return this.pendingEvent != null || this.pendingHazard != null;
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
    const res = e.get(Resources);
    if (res) {
      const max = config.resources.max;
      const maxPower = e.get(MaxResources)?.power ?? max.power;
      // Re-pool the suit's unused O₂ back into the rover; bank water + parts.
      const patch = applyEffects(
        res,
        [
          { target: "oxygen", delta: ended.o2 },
          { target: "water", delta: ended.haul.water },
          { target: "parts", delta: ended.haul.parts },
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
    if (outcome) e.set(Outcome, { score: outcome.score + ended.haul.score });
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
      // A hazard on the road takes precedence over a random event the same tick.
      this.rollHazard();
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
    const maxRes = e.get(MaxResources);
    d.hull = res ? res.hull / (maxRes?.hull ?? max.hull) : 1;
    d.power = res ? res.power / Math.max(1, maxRes?.power ?? max.power) : 1;
    d.critical = res ? res.oxygen <= 0 || res.hull <= 0 || res.morale <= 10 : false;
  }

  /** A UI-cadence snapshot of the run (call from React effects/handlers, not per-frame). */
  snapshot(): RunSnapshot | null {
    const e = this.entity;
    if (!e) return null;
    const pos = e.get(Position);
    const travel = e.get(Travel);
    const outcome = e.get(Outcome);
    const crew = (e.get(Crew) ?? []).map((c) => ({
      id: c.id,
      alive: c.alive,
      condition: c.condition,
    }));
    return {
      sol: pos?.sol ?? 1,
      distance: pos?.distance ?? 0,
      goal: config.travel.totalDistance,
      resources: e.get(Resources),
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
    };
  }
}

export const run = new Run();
