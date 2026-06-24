/**
 * Depot cart model + pure derivations. The depot screen holds a single `DepotState`
 * (quantity per store-item id) and derives everything — cost, payload, missing
 * vitals, the spawn loadout — from it. One source of truth, no dual-mutation
 * (docs: m5-2). Pure: no koota, no React, so it's directly testable.
 */

import { config } from "@/config";
import type { Loadout } from "@/sim/factories";

/** Quantity bought per store item id (kg for bulk, count otherwise). */
export type DepotState = Record<string, number>;

/** Cart seeded at each item's startQty (e.g. the 1 free RTG). */
export function initialDepot(): DepotState {
  const cart: DepotState = {};
  for (const item of config.store.items) cart[item.id] = item.startQty;
  return cart;
}

/** Total credits the current cart costs. */
export function cartCost(cart: DepotState): number {
  return config.store.items.reduce((sum, item) => sum + (cart[item.id] ?? 0) * item.price, 0);
}

/** Total payload mass (every unit counts 1 toward the cap, matching the POC). */
export function cartPayload(cart: DepotState): number {
  return config.store.items.reduce((sum, item) => sum + (cart[item.id] ?? 0), 0);
}

/**
 * Credits remaining against the budget. The budget is the chosen sponsor's funding (the
 * Oregon Trail profession analog) — it defaults to the depot's base budget so pure
 * callers/tests that don't pick a sponsor still work.
 */
export function creditsLeft(cart: DepotState, budget: number = config.store.budget): number {
  return budget - cartCost(cart);
}

/** Payload capacity remaining against the cap. */
export function payloadLeft(cart: DepotState): number {
  return config.store.payloadCap - cartPayload(cart);
}

/** Whether buying `step` more of `itemId` fits both budget and payload. */
export function canBuy(
  cart: DepotState,
  itemId: string,
  budget: number = config.store.budget,
): boolean {
  const item = config.store.items.find((i) => i.id === itemId);
  if (!item) return false;
  const next = (cart[itemId] ?? 0) + item.step;
  if (next > item.max) return false;
  if (cartCost(cart) + item.step * item.price > budget) return false;
  if (cartPayload(cart) + item.step > config.store.payloadCap) return false;
  return true;
}

/** Whether selling `step` of `itemId` is possible (stays ≥ 0). */
export function canSell(cart: DepotState, itemId: string): boolean {
  const item = config.store.items.find((i) => i.id === itemId);
  if (!item) return false;
  return (cart[itemId] ?? 0) - item.step >= 0;
}

/** Apply a buy/sell of one step, returning a new cart (clamped to [0, max]). */
export function adjust(
  cart: DepotState,
  itemId: string,
  dir: 1 | -1,
  budget: number = config.store.budget,
): DepotState {
  const item = config.store.items.find((i) => i.id === itemId);
  if (!item) return cart;
  if (dir === 1 && !canBuy(cart, itemId, budget)) return cart;
  if (dir === -1 && !canSell(cart, itemId)) return cart;
  const next = Math.max(0, Math.min(item.max, (cart[itemId] ?? 0) + dir * item.step));
  return { ...cart, [itemId]: next };
}

/** The life-support vitals that must be non-zero for a survivable departure. */
export const VITAL_ITEMS = ["oxygen", "water", "rations"] as const;

/** Vital item ids currently at zero (drives the launch warning). */
export function missingVitals(cart: DepotState): string[] {
  return VITAL_ITEMS.filter((id) => (cart[id] ?? 0) <= 0);
}

/** Total Credit cost of a set of selected upgrade ids (the depot factory-fit price). */
export function upgradesCreditCost(upgradeIds: readonly string[]): number {
  return config.upgrades.catalog
    .filter((u) => upgradeIds.includes(u.id))
    .reduce((sum, u) => sum + u.creditCost, 0);
}

/**
 * Whether buying `upgradeId` (not already owned) still fits the remaining budget after the
 * cart cost + the already-selected upgrades' Credit cost.
 */
export function canBuyUpgrade(
  cart: DepotState,
  selected: readonly string[],
  upgradeId: string,
  budget: number = config.store.budget,
): boolean {
  const upg = config.upgrades.catalog.find((u) => u.id === upgradeId);
  if (!upg || selected.includes(upgradeId)) return false;
  const spent = cartCost(cart) + upgradesCreditCost(selected);
  return spent + upg.creditCost <= budget;
}

/**
 * Translate the cart + chosen upgrades + sponsor multiplier into the sim's spawn Loadout.
 * Upgrades and the sponsor's score multiplier flow through here into the run.
 */
export function buildLoadout(
  cart: DepotState,
  upgrades: readonly string[] = [],
  scoreMultiplier = 1,
): Loadout {
  return {
    oxygen: cart.oxygen ?? 0,
    water: cart.water ?? 0,
    rations: cart.rations ?? 0,
    parts: cart.parts ?? 0,
    medkits: cart.medkits ?? 0,
    rtg: Math.max(1, cart.rtg ?? 1),
    upgrades: [...upgrades],
    scoreMultiplier,
  };
}
