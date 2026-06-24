/**
 * Per-Sol hull wear from terrain (POC driving hDamage). Damage scales with the zone's
 * hullDamage × pace², reduced by the suspension upgrade. Only accrues while driving.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Resources, Terrain, Travel, Upgrades } from "../traits";
import { clamp } from "./helpers";

export function hullSystem(expedition: Entity): void {
  const res = expedition.get(Resources);
  const travel = expedition.get(Travel);
  const terrain = expedition.get(Terrain);
  const upgrades = expedition.get(Upgrades);
  if (!res || !travel || !terrain || !upgrades) return;
  if (!travel.driving) return;

  const zone = config.terrain.zones[terrain.zone];
  const pace = config.travel.pace[travel.pace];
  if (!zone || !pace) return;

  const paceSq = pace.speedMult * pace.speedMult;
  let damage = zone.hullDamage * paceSq;
  if (upgrades.suspension) damage *= config.upgrades.effects.suspensionDamageMult;

  expedition.set(Resources, { hull: clamp(res.hull - damage, config.resources.max.hull) });
}
