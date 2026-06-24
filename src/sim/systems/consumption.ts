/**
 * Per-Sol life-support consumption (POC `applyConsumption`, vitals half). Drains oxygen,
 * water, rations once per living crew member, applying the nadia consumption trait, the
 * scrubbers oxygen cut, the ration-level multiplier, and the microHydroponics ration yield.
 * Morale drain lives in the morale system; this system owns only the vitals.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Crew, Resources, Travel, Upgrades } from "../traits";
import { aliveCount, clamp, isAlive } from "./helpers";

export function consumptionSystem(expedition: Entity): void {
  const crew = expedition.get(Crew);
  const res = expedition.get(Resources);
  const travel = expedition.get(Travel);
  const upgrades = expedition.get(Upgrades);
  if (!crew || !res || !travel || !upgrades) return;

  const alive = aliveCount(crew);
  if (alive === 0) return;

  const drain = config.resources.drainPerCrew;
  const max = config.resources.max;
  // nadia trait: −20% water + rations drain (oxygen is unaffected, matching the POC).
  const sMult = isAlive(crew, "nadia")
    ? (config.crew.roster.find((m) => m.id === "nadia")?.traits.consumptionMult ?? 1)
    : 1;
  const oxygenMult = upgrades.scrubbers ? config.upgrades.effects.scrubbersOxygenMult : 1;
  const rationMult = config.travel.rations[travel.rationLevel]?.consumptionMult ?? 1;

  const oxygen = res.oxygen - drain.oxygen * alive * oxygenMult;
  const water = res.water - drain.water * alive * sMult;
  let rations = res.rations - drain.rations * alive * sMult * rationMult;
  // microHydroponics: cultivates +N rations per Sol (un-overload addition).
  if (upgrades.microHydroponics) rations += config.upgrades.effects.hydroponicsRationsPerSol;

  expedition.set(Resources, {
    oxygen: clamp(oxygen, max.oxygen),
    water: clamp(water, max.water),
    rations: clamp(rations, max.rations),
  });
}
