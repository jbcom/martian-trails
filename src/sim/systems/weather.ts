/**
 * Per-Sol weather state machine (the POC's dust-storm the scaffold never triggered, made
 * deterministic). Each driving Sol a seeded per-Sol roll may KICK UP a dust storm, and an
 * active storm has a per-Sol chance to BLOW OVER. The storm is what the power system reads
 * for its cold-snap surcharge + reduced recharge, and what the render layer reads (via the
 * diagnostics bridge) to spawn the dust-storm particle overlay.
 *
 * Using the forked rng keeps the weather sequence reproducible for a given seed — same seed,
 * same storms. Pure: no three/react/DOM, no Math.random (draws from the seeded RngSource).
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Position, RngSource, Travel, Weather } from "../traits";

export function weatherSystem(expedition: Entity): void {
  const pos = expedition.get(Position);
  const travel = expedition.get(Travel);
  const weather = expedition.get(Weather);
  const baseRng = expedition.get(RngSource);
  if (!pos || !travel || !weather || !baseRng) return;
  // Weather only evolves while underway (the POC rolled it on the driving pass).
  if (!travel.driving) return;
  if (pos.distance < config.weather.onsetMinDistance) return;

  // A fresh sub-stream per Sol keeps the weather draw isolated + reproducible.
  const rng = baseRng.fork(`weather:${pos.sol}`);

  if (weather.kind === "dust_storm") {
    // An active storm has a per-Sol chance to clear.
    if (rng.chance(config.weather.clearChance)) {
      expedition.set(Weather, { kind: "clear" });
    }
    return;
  }

  // Clear skies — a per-Sol chance a storm kicks up.
  if (rng.chance(config.weather.stormChance)) {
    expedition.set(Weather, { kind: "dust_storm" });
  }
}
