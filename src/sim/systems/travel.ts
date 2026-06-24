/**
 * Per-Sol distance accumulation + outpost arrival (POC driving distance + OUTPOSTS pass).
 * Distance advances by baseSpeed × pace × terrain.speed km each driving Sol. Crossing an
 * outpost's distance advances the `nextOutpost` cursor — the screen layer reads that to halt
 * and present the outpost (this system stays pure and only moves the marker).
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Position, Terrain, Travel } from "../traits";

/** Distance covered in one driving Sol at the given pace/zone. */
export function solDistance(paceKey: string, zoneIndex: number): number {
  const pace = config.travel.pace[paceKey];
  const zone = config.terrain.zones[zoneIndex];
  if (!pace || !zone) return 0;
  return config.travel.baseSpeed * pace.speedMult * zone.speed;
}

export function travelSystem(expedition: Entity): void {
  const pos = expedition.get(Position);
  const travel = expedition.get(Travel);
  const terrain = expedition.get(Terrain);
  if (!pos || !travel || !terrain) return;
  if (!travel.driving) return;

  const distance = pos.distance + solDistance(travel.pace, terrain.zone);

  // Advance the outpost cursor past every waypoint we've now reached.
  let nextOutpost = pos.nextOutpost;
  const outposts = config.terrain.outposts;
  while (nextOutpost < outposts.length && distance >= outposts[nextOutpost].distance) {
    nextOutpost++;
  }

  expedition.set(Position, { distance, nextOutpost });
}
