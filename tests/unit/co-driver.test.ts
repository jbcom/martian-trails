import { describe, expect, it } from "vitest";
import { allCoDrivers, getCoDriver } from "@/content/coDrivers";
import { selectCoDriverAdvice } from "@/sim/coDriver";

const LOW_WATER_CONTEXT = {
  sol: 7,
  distance: 420,
  resources: {
    oxygen: 700,
    water: 80,
    rations: 650,
    power: 100,
    parts: 8,
    medkits: 4,
    morale: 82,
    hull: 90,
    rtg: 2,
  },
  maxResources: {
    oxygen: 1000,
    water: 1000,
    rations: 1000,
    power: 120,
    morale: 100,
    hull: 100,
  },
  pace: "steady",
  rationLevel: "filling",
};

describe("co-driver content + advice", () => {
  it("loads validated co-driver content with portraits and non-neutral loadout patches", () => {
    const coDrivers = allCoDrivers();
    expect(coDrivers.map((co) => co.id)).toEqual([
      "codriver:okonkwo",
      "codriver:reyes",
      "codriver:vasquez",
    ]);

    for (const coDriver of coDrivers) {
      expect(coDriver.portrait).toMatch(/^(okonkwo|reyes|vasquez)$/);
      const patch = Object.values(coDriver.loadoutPatch);
      expect(patch.some((value) => value > 0)).toBe(true);
      expect(patch.some((value) => value < 0)).toBe(true);
    }
  });

  it("selects deterministic advice for the same co-driver and run state", () => {
    const first = selectCoDriverAdvice("codriver:okonkwo", LOW_WATER_CONTEXT);
    const second = selectCoDriverAdvice("codriver:okonkwo", LOW_WATER_CONTEXT);
    expect(first).toEqual(second);
    expect(first?.trigger).toBe("low-water");
    expect(first?.text).toMatch(/water|ration|tank|leak/i);
  });

  it("is fallible across Sols without using a random stream", () => {
    const seen = new Set<boolean>();
    for (let sol = 1; sol <= 48; sol++) {
      const advice = selectCoDriverAdvice("codriver:reyes", { ...LOW_WATER_CONTEXT, sol });
      if (advice) seen.add(advice.misleading);
    }
    expect(seen).toEqual(new Set([false, true]));
  });

  it("returns null for an unknown co-driver id", () => {
    expect(getCoDriver("codriver:missing")).toBeUndefined();
    expect(selectCoDriverAdvice("codriver:missing", LOW_WATER_CONTEXT)).toBeNull();
  });
});
