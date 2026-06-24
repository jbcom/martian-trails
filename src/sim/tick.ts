/**
 * The sim orchestrator. `advanceSol` runs one discrete Martian day through every system in
 * explicit dependency order (the POC's processSol pass, decomposed). `step` is the
 * engine-facing entry: it accumulates the fixed-timestep `dt` the loop feeds and triggers
 * `advanceSol` each time a full Sol of wall-time elapses, so the calendar rides the
 * deterministic loop rather than raw frame deltas (docs/ARCHITECTURE.md pattern 1).
 *
 * Purity: no three/react/DOM, no Math.random (illness/terrain draw from the seeded
 * RngSource), no performance.now (time arrives only as `dt`).
 */
import type { Entity, World } from "koota";
import { consumptionSystem } from "./systems/consumption";
import { hullSystem } from "./systems/hull";
import { illnessSystem } from "./systems/illness";
import { moraleSystem } from "./systems/morale";
import { outcomeSystem } from "./systems/outcome";
import { powerSystem } from "./systems/power";
import { scoringSystem } from "./systems/scoring";
import { terrainSystem } from "./systems/terrain";
import { travelSystem } from "./systems/travel";
import { weatherSystem } from "./systems/weather";
import { Outcome, Position, RngSource, SolClock } from "./traits";

/** Wall-clock seconds that make up one Sol of in-game time. */
export const SECONDS_PER_SOL = 3.5;

/**
 * Advance one expedition entity by exactly one Sol. Runs the systems in dependency order:
 * move → weather → reterrain → wear → power → consume → morale → illness → resolve → score.
 * Weather runs before power so a storm that kicks up THIS Sol drives the same Sol's cold-snap
 * surcharge + reduced recharge (the POC rolled weather at the head of the driving pass).
 */
export function advanceSol(expedition: Entity): void {
  if (expedition.get(Outcome)?.status !== "running") return;

  const pos = expedition.get(Position);
  if (pos) expedition.set(Position, { sol: pos.sol + 1 });

  travelSystem(expedition);
  weatherSystem(expedition);
  terrainSystem(expedition);
  hullSystem(expedition);
  powerSystem(expedition);
  consumptionSystem(expedition);
  moraleSystem(expedition);
  illnessSystem(expedition);
  outcomeSystem(expedition);
  scoringSystem(expedition);
}

/** Advance every running expedition in the world by one Sol. */
export function advanceSolAll(world: World): void {
  for (const entity of world.query(Position, Outcome, RngSource)) {
    advanceSol(entity);
  }
}

/**
 * Engine step. Accumulate `dt` (seconds) per entity; each full Sol elapsed runs `advanceSol`.
 * Returns the number of Sols advanced across the world this call.
 */
export function step(world: World, dt: number): number {
  let sols = 0;
  for (const entity of world.query(Position, Outcome, RngSource, SolClock)) {
    if (entity.get(Outcome)?.status !== "running") continue;
    let acc = (entity.get(SolClock)?.accumulator ?? 0) + Math.max(0, dt);
    while (acc >= SECONDS_PER_SOL) {
      acc -= SECONDS_PER_SOL;
      advanceSol(entity);
      sols++;
      if (entity.get(Outcome)?.status !== "running") {
        acc = 0;
        break;
      }
    }
    entity.set(SolClock, { accumulator: acc });
  }
  return sols;
}
