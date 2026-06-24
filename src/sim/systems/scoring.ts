/**
 * Terminus scoring (POC `victory` formula): base + survivors×weight + floor(vitals/divisor)
 * − sol×perSol, floored. Pure function plus a system that stamps the score onto the Outcome
 * trait when the run is won. Lives in the sim so the terminus screen reads a settled number.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Crew, Outcome, Position, Resources } from "../traits";
import { aliveCount } from "./helpers";

/** Compute the UNOMA rating from raw run state (POC scoring formula). */
export function computeScore(input: {
  survivors: number;
  oxygen: number;
  water: number;
  rations: number;
  sol: number;
}): number {
  const s = config.scoring;
  const raw =
    s.base +
    input.survivors * s.perSurvivor +
    Math.floor((input.oxygen + input.water + input.rations) / s.resourceDivisor) -
    input.sol * s.perSol;
  return Math.max(s.floor, raw);
}

export function scoringSystem(expedition: Entity): void {
  const outcome = expedition.get(Outcome);
  const crew = expedition.get(Crew);
  const res = expedition.get(Resources);
  const pos = expedition.get(Position);
  if (!outcome || !crew || !res || !pos) return;
  if (outcome.status !== "won") return;

  const score = computeScore({
    survivors: aliveCount(crew),
    oxygen: res.oxygen,
    water: res.water,
    rations: res.rations,
    sol: pos.sol,
  });
  expedition.set(Outcome, { score });
}
