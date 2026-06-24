import { createWorld, type Entity, type World } from "koota";
import { defaultLoadout, type Loadout, spawnExpedition } from "@/sim/factories";

// koota caps live worlds at 16, and the sweep-style tests create many. Destroy the previous
// world on each call so at most one test world is alive at a time.
let previous: World | undefined;

/** Spawn an expedition into a fresh world with optional loadout overrides. */
export function makeExpedition(
  seed = "test",
  loadout: Partial<Loadout> = {},
): { world: World; e: Entity } {
  if (previous) {
    previous.destroy();
    previous = undefined;
  }
  const world = createWorld();
  previous = world;
  const e = spawnExpedition(world, seed, { ...defaultLoadout(), ...loadout });
  return { world, e };
}
