import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";
import { STORE_ITEMS, eventLog, gameState, logMsg } from "../../src/lib/GameState";

describe("Martian Trail GameState Tests", () => {
  beforeEach(() => {
    gameState.reset();
    eventLog.set([]);

    // Reset quantities in shop config for a clean baseline
    for (const key of Object.keys(STORE_ITEMS)) {
      STORE_ITEMS[key as keyof typeof STORE_ITEMS].qty = key === "rtg" ? 1 : 0;
    }
  });

  it("should initialize with correct default configurations", () => {
    const state = get(gameState);
    expect(state.mode).toBe("depot");
    expect(state.distance).toBe(0);
    expect(state.sol).toBe(1);
    expect(state.isDriving).toBe(false);
    expect(state.crew.length).toBe(4);
    expect(state.crew.every((c) => c.alive)).toBe(true);
  });

  it("should prevent purchasing exceeding max payload bounds", () => {
    // Liquid O2 max limit is 1000, step is 50. Let's attempt to buy 1100.
    gameState.buyItem("oxygen", 1100);
    const state = get(gameState);
    expect(state.resources.oxygen).toBe(0); // Fails and remains 0
  });

  it("should accurately handle bulk resources transactions", () => {
    gameState.buyItem("oxygen", 100);
    const state = get(gameState);
    expect(state.resources.oxygen).toBe(100);
    expect(STORE_ITEMS.oxygen.qty).toBe(100);

    // Selling transaction
    gameState.buyItem("oxygen", -50);
    const state2 = get(gameState);
    expect(state2.resources.oxygen).toBe(50);
    expect(STORE_ITEMS.oxygen.qty).toBe(50);
  });

  it("should append log message console items systematically", () => {
    logMsg("Airlock sealed", "system");
    const log = get(eventLog);
    expect(log.length).toBe(1);
    expect(log[0]).toEqual({ text: "Airlock sealed", type: "system" });
  });
});
