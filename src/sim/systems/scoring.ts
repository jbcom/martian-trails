/**
 * Terminus scoring (POC `victory` formula): base + survivors×weight + floor(vitals/divisor)
 * − sol×perSol, floored. Pure function plus a system that stamps the score onto the Outcome
 * trait when the run is won. Lives in the sim so the terminus screen reads a settled number.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Crew, Outcome, Position, Resources, Sponsor } from "../traits";
import { aliveCount } from "./helpers";

/**
 * Compute the UNOMA rating from raw run state (POC scoring formula) scaled by the sponsor
 * multiplier (the Oregon Trail profession multiplier — a leaner-budget sponsor multiplies a
 * higher score). The base raw score is floored first, then multiplied, so the multiplier
 * always rewards the prestige run. `scoreMultiplier` defaults to ×1 (full-funding UNOMA).
 */
export function computeScore(input: {
  survivors: number;
  oxygen: number;
  water: number;
  rations: number;
  sol: number;
  scoreMultiplier?: number;
}): number {
  const s = config.scoring;
  const raw =
    s.base +
    input.survivors * s.perSurvivor +
    Math.floor((input.oxygen + input.water + input.rations) / s.resourceDivisor) -
    input.sol * s.perSol;
  return Math.round(Math.max(s.floor, raw) * (input.scoreMultiplier ?? 1));
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
    scoreMultiplier: expedition.get(Sponsor)?.scoreMultiplier ?? 1,
  });
  expedition.set(Outcome, { score });
}
