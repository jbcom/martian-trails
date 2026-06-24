import { describe, expect, it } from "vitest";
import { resourcesSchema, terrainSchema } from "@/schemas/config";
import { illnessSchema } from "@/schemas/illness";

// The loader (index.ts) calls schema.parse on each JSON at import, so a malformed config is
// a load-time error. These tests exercise that the schemas actually reject bad data.
describe("config schemas — fail-fast validation", () => {
  it("rejects a negative drain rate", () => {
    const bad = {
      max: { oxygen: 1000, water: 1000, rations: 1000, power: 100, morale: 100, hull: 100 },
      drainPerCrew: { oxygen: -1, water: 1.2, rations: 1.2, morale: 1.2 },
      maxPowerPerRtg: 100,
    };
    expect(resourcesSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a malformed hex color on a terrain zone", () => {
    const bad = {
      zones: [{ name: "X", speed: 1, power: 1, hullDamage: 1, color: "red" }],
      outposts: [{ name: "O", distance: 10 }],
      zoneChangeMinDistance: 0,
    };
    expect(terrainSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an out-of-range mortality probability", () => {
    const bad = {
      conditions: [
        {
          id: "x",
          name: "X",
          cause: "y",
          progressionPerSol: 0.1,
          mortalityPerSol: 1.5,
          moralePenaltyPerSol: 5,
          moralePenaltyOnDeath: 20,
        },
      ],
      criticalSeverity: 1,
      lowMoraleThreshold: 10,
      lowMoraleDeathChance: 0.1,
      healMoraleBonus: 10,
    };
    expect(illnessSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a well-formed resources config", () => {
    const ok = {
      max: { oxygen: 1000, water: 1000, rations: 1000, power: 100, morale: 100, hull: 100 },
      drainPerCrew: { oxygen: 1, water: 1.2, rations: 1.2, morale: 1.2 },
      maxPowerPerRtg: 100,
    };
    expect(resourcesSchema.safeParse(ok).success).toBe(true);
  });
});
