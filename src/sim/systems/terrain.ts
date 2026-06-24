/**
 * Per-Sol terrain zone selection (POC random zone swap, made deterministic). Past the
 * minimum distance, a seeded per-Sol roll may switch the active zone to a different one.
 * Using the forked rng keeps the zone sequence reproducible for a given seed — same seed,
 * same trail underfoot.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Position, RngSource, Terrain, Travel } from "../traits";

/** Per-Sol probability the zone changes once past the min distance. */
const ZONE_CHANGE_CHANCE = 0.3;

export function terrainSystem(expedition: Entity): void {
  const pos = expedition.get(Position);
  const terrain = expedition.get(Terrain);
  const travel = expedition.get(Travel);
  const baseRng = expedition.get(RngSource);
  if (!pos || !terrain || !travel || !baseRng) return;
  if (!travel.driving) return;
  if (pos.distance < config.terrain.zoneChangeMinDistance) return;

  const rng = baseRng.fork(`terrain:${pos.sol}`);
  if (!rng.chance(ZONE_CHANGE_CHANCE)) return;

  const zones = config.terrain.zones;
  if (zones.length <= 1) return;

  // Pick a zone different from the current one (deterministic, seeded).
  const others = zones.map((_, i) => i).filter((i) => i !== terrain.zone);
  const next = rng.pick(others);
  expedition.set(Terrain, { zone: next });
}
