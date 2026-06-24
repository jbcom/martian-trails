import { createWorld, type Entity, type World } from "koota";
import { config } from "@/config";
import type { Loadout } from "@/sim/factories";
import { spawnExpedition } from "@/sim/factories";
import { step } from "@/sim/tick";
import { Crew, MaxResources, Outcome, Position, Resources } from "@/sim/traits";
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
  driving: boolean;
}

/** Clamp huge frame gaps (tab backgrounded) so one slow frame can't skip Sols. */
const MAX_TICK_DT = 1 / 4;

class Run {
  private world: World | null = null;
  private entity: Entity | null = null;
  private driving = false;

  /** Begin a fresh run. Resets the diagnostics bridge + spawns the expedition. */
  start(seed: string, loadout?: Loadout): void {
    this.world = createWorld();
    this.entity = spawnExpedition(this.world, seed, loadout);
    this.driving = false;
    resetDiagnostics();
    this.publish();
  }

  /** Whether a run is active and still going. */
  get active(): boolean {
    return this.entity != null && this.entity.get(Outcome)?.status === "running";
  }

  setDriving(on: boolean): void {
    this.driving = on;
    getDiagnostics().driving = on && this.active;
  }

  /**
   * Advance wall-clock `dt` seconds; ticks the sim only while driving. `step`
   * owns the Sol clock (it banks dt into the SolClock trait and fires a Sol per
   * SECONDS_PER_SOL), so we hand it the raw clamped frame delta directly — the
   * engine `advance()` accumulator is for fixed-step sub-systems, not this.
   */
  tick(dt: number): void {
    if (!this.world || !this.entity) return;
    if (this.driving && this.active) {
      step(this.world, Math.min(Math.max(0, dt), MAX_TICK_DT));
    }
    this.publish();
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
    d.driving = this.driving && this.active;
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
      outcome: (e.get(Outcome)?.status ?? "running") as RunSnapshot["outcome"],
      driving: this.driving,
    };
  }
}

export const run = new Run();
