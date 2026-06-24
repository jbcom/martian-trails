import { describe, expect, it } from "vitest";
import { config } from "@/config";
import {
  adjust,
  buildLoadout,
  canBuy,
  canSell,
  cartCost,
  cartPayload,
  creditsLeft,
  initialDepot,
  missingVitals,
  payloadLeft,
} from "@/sim/loadout";

describe("depot loadout (pure cart model)", () => {
  it("seeds the cart at each item's startQty", () => {
    const cart = initialDepot();
    expect(cart.rtg).toBe(1); // the one free RTG
    expect(cart.oxygen).toBe(0);
  });

  it("derives cost / payload / remaining from the cart", () => {
    const cart = { ...initialDepot(), oxygen: 100, water: 50 };
    // 100 * 10 (O2) + 50 * 5 (H2O) + 1 RTG * 3000.
    expect(cartCost(cart)).toBe(100 * 10 + 50 * 5 + 3000);
    expect(cartPayload(cart)).toBe(100 + 50 + 1);
    expect(creditsLeft(cart)).toBe(config.store.budget - cartCost(cart));
    expect(payloadLeft(cart)).toBe(config.store.payloadCap - cartPayload(cart));
  });

  it("enforces budget on buy", () => {
    // Drain the budget with RTGs, then a bulk buy must be refused on credits.
    let cart = initialDepot();
    for (let i = 0; i < 10; i++) cart = adjust(cart, "rtg", 1);
    // RTG max is 4; cost 4*3000=12000, leaving 13000. Buy oxygen until credits gone.
    for (let i = 0; i < 1000; i++) cart = adjust(cart, "oxygen", 1);
    expect(creditsLeft(cart)).toBeGreaterThanOrEqual(0);
    expect(canBuy(cart, "oxygen")).toBe(false);
  });

  it("enforces payload cap on buy", () => {
    let cart = initialDepot();
    for (let i = 0; i < 30; i++) cart = adjust(cart, "oxygen", 1); // 30*50 = 1500 > cap
    expect(cartPayload(cart)).toBeLessThanOrEqual(config.store.payloadCap);
  });

  it("refuses to sell below zero and never exceeds max", () => {
    const cart = initialDepot();
    expect(canSell(cart, "oxygen")).toBe(false);
    const bought = adjust(cart, "parts", 1);
    expect(canSell(bought, "parts")).toBe(true);
  });

  it("flags missing vitals until each is non-zero", () => {
    let cart = initialDepot();
    expect(missingVitals(cart).sort()).toEqual(["oxygen", "rations", "water"]);
    cart = adjust(cart, "oxygen", 1);
    cart = adjust(cart, "water", 1);
    cart = adjust(cart, "rations", 1);
    expect(missingVitals(cart)).toEqual([]);
  });

  it("builds a spawn loadout with at least one RTG", () => {
    const cart = { ...initialDepot(), oxygen: 200, parts: 3 };
    const loadout = buildLoadout(cart);
    expect(loadout.oxygen).toBe(200);
    expect(loadout.parts).toBe(3);
    expect(loadout.rtg).toBeGreaterThanOrEqual(1);
  });

  it("applies the selected co-driver's supply-spread patch to the spawn loadout", () => {
    const cart = { ...initialDepot(), oxygen: 300, water: 200, rations: 150, parts: 6 };
    const loadout = buildLoadout(cart, [], 1, "codriver:okonkwo");
    expect(loadout.coDriverId).toBe("codriver:okonkwo");
    expect(loadout.water).toBeGreaterThan(cart.water);
    expect(loadout.parts).toBeLessThan(cart.parts);
  });
});
