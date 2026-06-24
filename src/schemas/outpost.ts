import { z } from "zod";

/**
 * Outpost / habitat services schema — the Oregon Trail "fort" analog (GAME-DESIGN.md §2 M8).
 * The waypoints themselves (name + km) live in terrain.json; this file is the per-outpost
 * SERVICES the player interacts with while docked: the cost/effect of resting in the habitat
 * and a small content-driven resupply exchange. The pure resolver (src/sim/outpost.ts)
 * interprets this — "code interprets content, never embeds it".
 *
 * A signed resource delta reuses the event/hazard effect vocabulary so the same clamp logic
 * (src/sim/event.ts applyEffects) applies the rest heal + trade swaps.
 */
export const outpostEffectSchema = z.object({
  target: z.enum(["oxygen", "water", "rations", "power", "morale", "hull", "parts", "medkits"]),
  delta: z.number(),
});
export type OutpostEffect = z.infer<typeof outpostEffectSchema>;

/** "Rest in Habitat" — heal crew + restore morale, paid for in Sols and vitals. */
export const restSchema = z.object({
  /** Sols the rest consumes (the calendar cost of stopping). */
  sols: z.number().int().min(1).max(20),
  /** Resource deltas the rest applies (positive heals, negative pays the upkeep). */
  effects: z.array(outpostEffectSchema).min(1),
  /** Whether resting clears non-fatal crew conditions back to healthy. */
  healsConditions: z.boolean().default(true),
});

/** A single resupply offer at the local exchange (give X, get Y). */
export const tradeOfferSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** One-line label, e.g. "Swap 2 Parts → 120 Water". */
  label: z.string().min(1).max(60),
  /** Resource deltas (the give-side negative, the get-side positive). */
  effects: z.array(outpostEffectSchema).min(1),
});
export type TradeOffer = z.infer<typeof tradeOfferSchema>;

/** One outpost's services, keyed to a terrain.outposts name. */
export const outpostServiceSchema = z.object({
  /** Must match a terrain.outposts[].name so the dock binds to the waypoint. */
  outpost: z.string().min(1),
  rest: restSchema,
  /** The local exchange offers (resupply / rebalance). */
  trades: z.array(tradeOfferSchema).min(1).max(4),
});
export type OutpostService = z.infer<typeof outpostServiceSchema>;

export const outpostsFileSchema = z.object({
  services: z.array(outpostServiceSchema).min(1),
  /** Tolerance (km) within which an outpost's distance counts as reached. */
  triggerWindow: z.number().min(1).default(40),
});
export type OutpostsConfig = z.infer<typeof outpostsFileSchema>;
