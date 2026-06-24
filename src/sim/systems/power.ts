/**
 * Per-Sol power balance (POC driving pDrain + Sol-rollover recharge). While driving, power
 * drains with pace² × terrain.power, ×1.5 below the low-hull threshold, plus a cold-snap
 * surcharge during a dust storm (the sim's pure analog of the POC's temperature curve —
 * cold bites when a storm drops the temperature below the onset). Then the Sol's recharge is
 * applied (reduced during a storm, boosted by solar on clear Sols), clamped to the pool max.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { MaxResources, Resources, Terrain, Travel, Upgrades, Weather } from "../traits";
import { clamp } from "./helpers";

/** Effective temperature for the Sol given weather. Pure analog of the POC day curve. */
export function solTemperature(weather: string): number {
  const base = config.travel.cold.baseTemp;
  return weather === "dust_storm" ? base - 20 : base;
}

export function powerSystem(expedition: Entity): void {
  const res = expedition.get(Resources);
  const max = expedition.get(MaxResources);
  const travel = expedition.get(Travel);
  const terrain = expedition.get(Terrain);
  const weather = expedition.get(Weather);
  const upgrades = expedition.get(Upgrades);
  if (!res || !max || !travel || !terrain || !weather || !upgrades) return;

  const zone = config.terrain.zones[terrain.zone];
  const pace = config.travel.pace[travel.pace];
  let power = res.power;

  if (travel.driving && zone && pace) {
    const paceSq = pace.speedMult * pace.speedMult;
    let drain = config.travel.powerDrainDriving * paceSq * zone.power;
    if (res.hull < config.travel.lowHull.threshold) drain *= config.travel.lowHull.powerMult;

    // Cold-snap surcharge (POC: temp < onset → |temp-onset| * coefficient; aerogel halves it).
    const temp = solTemperature(weather.kind);
    if (temp < config.travel.cold.onsetTemp) {
      let cold = Math.abs(temp - config.travel.cold.onsetTemp) * config.travel.cold.coefficient;
      if (upgrades.aerogel) cold *= config.upgrades.effects.aerogelColdMult;
      drain += cold;
    }
    power -= drain;
  }

  // Per-Sol recharge (POC: storm 2 / clear 25; solar ×1.4 on clear Sols).
  let recharge =
    weather.kind === "dust_storm" ? config.travel.recharge.storm : config.travel.recharge.clear;
  if (upgrades.solar && weather.kind !== "dust_storm")
    recharge *= config.upgrades.effects.solarRechargeMult;
  power = Math.min(max.power, power + recharge);

  expedition.set(Resources, { power: clamp(power, max.power) });
}
