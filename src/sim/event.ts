/**
 * Pure trail-event resolution. An event option carries a small declarative list of
 * effects ({ target, delta }); applying it adds each signed delta to the matching
 * Resources field, clamped to [0, max] for the capped pools (parts/medkits/rtg are
 * uncapped counters). Pure — no koota, no React — so it's trivially testable and the
 * run controller is the only thing that writes it back to the entity.
 */

import { config } from "@/config";
import type { Effect } from "@/schemas/event";

/** The subset of Resources fields an event effect may touch. */
export type EventResources = {
  oxygen: number;
  water: number;
  rations: number;
  power: number;
  morale: number;
  hull: number;
  parts: number;
  medkits: number;
};

/** Per-pool maxima for the capped resources; counters have no ceiling. */
function maxFor(target: keyof EventResources, maxPower: number): number {
  const max = config.resources.max;
  switch (target) {
    case "oxygen":
      return max.oxygen;
    case "water":
      return max.water;
    case "rations":
      return max.rations;
    case "power":
      return maxPower;
    case "morale":
      return max.morale;
    case "hull":
      return max.hull;
    default:
      // parts / medkits are uncapped counters.
      return Number.POSITIVE_INFINITY;
  }
}

/**
 * Apply a chosen option's effects to a resource snapshot, returning the patch to
 * write back. `maxPower` is the entity's RTG-derived power ceiling. Every touched
 * field is clamped to [0, max]; untouched fields are omitted from the patch.
 */
export function applyEffects(
  current: EventResources,
  effects: readonly Effect[],
  maxPower: number,
): Partial<EventResources> {
  const patch: Partial<EventResources> = {};
  for (const effect of effects) {
    const target = effect.target;
    const base = patch[target] ?? current[target];
    const next = base + effect.delta;
    patch[target] = Math.max(0, Math.min(next, maxFor(target, maxPower)));
  }
  return patch;
}
