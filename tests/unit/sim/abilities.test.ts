import { describe, expect, it } from "vitest";
import { config } from "@/config";
import { abilityBlock, abilityForCrew, cooldownRemaining, resolveAbility } from "@/sim/abilities";
import type { CrewState } from "@/sim/traits";

const RES = {
  oxygen: 500,
  water: 500,
  rations: 100,
  power: 80,
  morale: 40,
  hull: 50,
  parts: 5,
  medkits: 3,
};

const healthy = (id: string): CrewState => ({ id, alive: true, condition: "healthy", severity: 0 });

describe("crew active abilities (pure resolution)", () => {
  it("binds one ability to each roster member that has one", () => {
    expect(abilityForCrew("john")?.id).toBe("rally-crew");
    expect(abilityForCrew("maya")?.id).toBe("jury-rig");
    expect(abilityForCrew("frank")?.id).toBe("deep-prospect");
    expect(abilityForCrew("nadia")?.id).toBe("emergency-harvest");
  });

  it("Rally Crew restores morale, clamped to the cap", () => {
    const a = abilityForCrew("john")!;
    const patch = resolveAbility(a, { ...RES, morale: 90 }, config.resources.max.power);
    expect(patch.morale).toBe(config.resources.max.morale); // 90 + 35 clamps to 100
  });

  it("Jury-Rig repairs hull with no part cost (spends power instead)", () => {
    const a = abilityForCrew("maya")!;
    const patch = resolveAbility(a, RES, config.resources.max.power);
    expect(patch.hull).toBe(RES.hull + 25);
    expect(patch.power).toBe(RES.power - 10);
    // No part consumed — parts untouched.
    expect(patch.parts).toBeUndefined();
  });

  it("Emergency Harvest yields rations at the cost of water", () => {
    const a = abilityForCrew("nadia")!;
    const patch = resolveAbility(a, RES, config.resources.max.power);
    expect(patch.rations).toBe(RES.rations + 120);
    expect(patch.water).toBe(RES.water - 60);
  });

  it("blocks a dead member, a cooldown, and an unaffordable cost", () => {
    const a = abilityForCrew("maya")!;
    // Dead.
    expect(abilityBlock(a, { ...healthy("maya"), alive: false }, RES, 10, undefined)).toBe("dead");
    // On cooldown (used Sol 8, 4-Sol cooldown → blocked through Sol 11).
    expect(abilityBlock(a, healthy("maya"), RES, 10, 8)).toBe("cooldown");
    // Off cooldown.
    expect(abilityBlock(a, healthy("maya"), RES, 13, 8)).toBeNull();
    // Unaffordable (no power for the −10 power cost).
    expect(abilityBlock(a, healthy("maya"), { ...RES, power: 5 }, 13, undefined)).toBe("afford");
  });

  it("cooldownRemaining counts down to ready", () => {
    const a = abilityForCrew("frank")!; // 5-Sol cooldown
    expect(cooldownRemaining(a, 10, undefined)).toBe(0);
    expect(cooldownRemaining(a, 12, 10)).toBe(3); // 10 + 5 − 12
    expect(cooldownRemaining(a, 15, 10)).toBe(0);
  });
});
