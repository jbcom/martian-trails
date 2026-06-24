import { createWorld, type Entity, type World } from "koota";
import { config } from "@/config";
import { allEvents } from "@/content/events";
import type { Rng } from "@/core/rng";
import type { Effect, TrailEvent } from "@/schemas/event";
import { applyEffects } from "@/sim/event";
import type { Loadout } from "@/sim/factories";
import { spawnExpedition } from "@/sim/factories";
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

  /** Begin a fresh run. Resets the diagnostics bridge + spawns the expedition. */
  start(seed: string, loadout?: Loadout): void {
    this.world = createWorld();
    this.entity = spawnExpedition(this.world, seed, loadout);
    this.driving = false;
    this.lastEventSol = this.entity.get(Position)?.sol ?? 1;
    this.seenEvents.clear();
    this.pendingEvent = null;
    this.eventRng = this.entity.get(RngSource)?.fork("events") ?? null;
    resetDiagnostics();
    this.publish();
  }

  /** Whether a run is active and still going. */
  get active(): boolean {
    return this.entity != null && this.entity.get(Outcome)?.status === "running";
  }

  setDriving(on: boolean): void {
    // A pending event halts the rover; it can't drive until the choice is made.
    this.driving = on && this.pendingEvent == null;
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
   * Advance wall-clock `dt` seconds; ticks the sim only while driving. `step`
   * owns the Sol clock (it banks dt into the SolClock trait and fires a Sol per
   * SECONDS_PER_SOL), so we hand it the raw clamped frame delta directly — the
   * engine `advance()` accumulator is for fixed-step sub-systems, not this.
   */
  tick(dt: number): void {
    if (!this.world || !this.entity) return;
    if (this.driving && this.active && this.pendingEvent == null) {
      step(this.world, Math.min(Math.max(0, dt), MAX_TICK_DT));
      this.rollEvent();
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
    if (!e || !events || this.pendingEvent) return;
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
    d.driving = this.driving && this.active && this.pendingEvent == null;
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
    };
  }
}

export const run = new Run();
