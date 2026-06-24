/**
 * Per-Sol morale drain (POC `applyConsumption` morale half). Base drain is halved by the
 * john trait; spikes when water or rations hit zero, when rations are below filling, and at
 * higher pace while driving. Runs AFTER consumption so the zero-vital checks see this Sol's
 * post-drain values, exactly as the POC sequences them.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Crew, Resources, Travel } from "../traits";
import { clamp, isAlive } from "./helpers";

export function moraleSystem(expedition: Entity): void {
  const crew = expedition.get(Crew);
  const res = expedition.get(Resources);
  const travel = expedition.get(Travel);
  if (!crew || !res || !travel) return;

  const moraleDrainMult = isAlive(crew, "john")
    ? (config.crew.roster.find((m) => m.id === "john")?.traits.moraleDrainMult ?? 1)
    : 1;

  let drop = config.resources.drainPerCrew.morale * moraleDrainMult;
  if (res.water <= 0) drop += config.travel.starvation.waterZero;
  if (res.rations <= 0) drop += config.travel.starvation.rationsZero;
  drop += config.travel.rations[travel.rationLevel]?.moralePenalty ?? 0;
  if (travel.driving) drop += config.travel.pace[travel.pace]?.moraleDrainBonus ?? 0;

  expedition.set(Resources, {
    morale: clamp(res.morale - drop, config.resources.max.morale),
  });
}
