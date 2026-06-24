/**
 * Pure outpost-services resolution — the Oregon Trail "fort" stop (GAME-DESIGN.md §2 M8).
 * Mirrors the event/hazard resolvers: given the docked outpost's services + the live
 * resources, it computes the resource patch for "Rest in Habitat" and for each resupply
 * trade, plus the Sols a rest costs and whether a trade is affordable. No koota, no React,
 * no three — the run controller is the only thing that writes the patch back to the entity.
 *
 * The outpost the rover docks at is bound to a terrain.outposts waypoint by name, so the
 * dock location, the lore (src/content/lore.ts), and the services (config.outposts) all key
 * off the same outpost name.
 */

import { config } from "@/config";
import type { OutpostEffect, OutpostService, TradeOffer } from "@/schemas/outpost";
import { applyEffects, type EventResources } from "@/sim/event";

/** The outpost the rover is docked at — the waypoint name + its bound services. */
export interface OutpostStop {
  /** Display name (matches terrain.outposts[].name and the lore key). */
  name: string;
  /** Km on the route where this outpost sits. */
  distance: number;
  /** The resolved services (rest + trades) for this outpost. */
  service: OutpostService;
}

/** Find the services config bound to a named outpost, or undefined. */
export function serviceForOutpost(name: string): OutpostService | undefined {
  return config.outposts.services.find((s) => s.outpost === name);
}

/** The Sols a rest at this outpost consumes. */
export function restSols(stop: OutpostStop): number {
  return stop.service.rest.sols;
}

/**
 * Resolve "Rest in Habitat": apply the rest effects (heal morale/hull/power, pay water/rations
 * upkeep) to the live resources, clamped to maxima. Pure — returns the patch the controller
 * writes back. The Sols + condition-healing are applied by the controller (they touch other
 * traits).
 */
export function resolveRest(
  stop: OutpostStop,
  current: EventResources,
  maxPower: number,
): Partial<EventResources> {
  return applyEffects(current, stop.service.rest.effects, maxPower);
}

/** Whether a trade is affordable — every give-side (negative) delta must stay ≥ 0. */
export function canAfford(offer: TradeOffer, current: EventResources): boolean {
  for (const effect of offer.effects) {
    if (effect.delta < 0 && (current[effect.target] ?? 0) + effect.delta < 0) return false;
  }
  return true;
}

/**
 * Resolve a resupply trade: apply its signed effects to the live resources (give-side
 * negative, get-side positive), clamped to maxima. Returns null if the player can't afford it
 * so the controller leaves the resources untouched.
 */
export function resolveTrade(
  offer: TradeOffer,
  current: EventResources,
  maxPower: number,
): Partial<EventResources> | null {
  if (!canAfford(offer, current)) return null;
  return applyEffects(current, offer.effects, maxPower);
}

/** A compact give/get summary for a trade's effect line, for the UI cost chips. */
export function tradeChips(offer: TradeOffer): { give: OutpostEffect[]; get: OutpostEffect[] } {
  return {
    give: offer.effects.filter((e) => e.delta < 0),
    get: offer.effects.filter((e) => e.delta > 0),
  };
}
