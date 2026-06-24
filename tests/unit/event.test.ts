import { describe, expect, it } from "vitest";
import { applyEffects, type EventResources } from "@/sim/event";

const BASE: EventResources = {
  oxygen: 500,
  water: 500,
  rations: 500,
  power: 80,
  morale: 60,
  hull: 90,
  parts: 5,
  medkits: 3,
};

describe("applyEffects (pure event resolution)", () => {
  it("adds signed deltas only to targeted fields", () => {
    const patch = applyEffects(BASE, [{ target: "morale", delta: -15 }], 100);
    expect(patch).toEqual({ morale: 45 });
  });

  it("clamps capped pools to [0, max]", () => {
    const patch = applyEffects(
      BASE,
      [
        { target: "oxygen", delta: -1000 }, // floors at 0
        { target: "morale", delta: 1000 }, // ceils at 100
      ],
      100,
    );
    expect(patch.oxygen).toBe(0);
    expect(patch.morale).toBe(100);
  });

  it("respects the RTG-derived power ceiling", () => {
    const patch = applyEffects(BASE, [{ target: "power", delta: 1000 }], 400);
    expect(patch.power).toBe(400);
  });

  it("leaves uncapped counters (parts/medkits) unbounded above", () => {
    const patch = applyEffects(BASE, [{ target: "parts", delta: 50 }], 100);
    expect(patch.parts).toBe(55);
  });

  it("accumulates multiple deltas on the same target", () => {
    const patch = applyEffects(
      BASE,
      [
        { target: "hull", delta: -10 },
        { target: "hull", delta: -5 },
      ],
      100,
    );
    expect(patch.hull).toBe(75);
  });
});
