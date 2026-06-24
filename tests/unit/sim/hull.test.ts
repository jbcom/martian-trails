import { describe, expect, it } from "vitest";
import { hullSystem } from "@/sim/systems/hull";
import { Resources, Terrain, Travel } from "@/sim/traits";
import { makeExpedition } from "./_util";

// damage = terrain.hullDamage * pace²; suspension ×0.7; only while driving.
describe("hullSystem", () => {
  it("wears hull by terrain.hullDamage × pace² (smooth + steady)", () => {
    const { e } = makeExpedition("h");
    e.set(Resources, { hull: 100 });
    hullSystem(e);
    expect(e.get(Resources)!.hull).toBeCloseTo(100 - 0.5 * 1, 5);
  });

  it("boulder field + grueling does 2.5 × 4 = 10 damage", () => {
    const { e } = makeExpedition("h", { pace: "grueling" });
    e.set(Resources, { hull: 100 });
    e.set(Terrain, { zone: 1 }); // boulder field 2.5
    e.set(Travel, { driving: true });
    hullSystem(e);
    expect(e.get(Resources)!.hull).toBeCloseTo(100 - 2.5 * 4, 5);
  });

  it("suspension reduces terrain damage by 30%", () => {
    const { e } = makeExpedition("h", { upgrades: ["suspension"] });
    e.set(Resources, { hull: 100 });
    e.set(Terrain, { zone: 1 });
    hullSystem(e);
    expect(e.get(Resources)!.hull).toBeCloseTo(100 - 2.5 * 1 * 0.7, 5);
  });

  it("does not wear hull when halted", () => {
    const { e } = makeExpedition("h");
    e.set(Resources, { hull: 100 });
    e.set(Travel, { driving: false });
    hullSystem(e);
    expect(e.get(Resources)!.hull).toBe(100);
  });

  it("clamps hull at zero", () => {
    const { e } = makeExpedition("h", { pace: "grueling" });
    e.set(Resources, { hull: 1 });
    e.set(Terrain, { zone: 1 });
    e.set(Travel, { driving: true });
    hullSystem(e);
    expect(e.get(Resources)!.hull).toBe(0);
  });
});
