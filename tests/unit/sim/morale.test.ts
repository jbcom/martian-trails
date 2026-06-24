import { describe, expect, it } from "vitest";
import { moraleSystem } from "@/sim/systems/morale";
import { Crew, Resources, Travel } from "@/sim/traits";
import { makeExpedition } from "./_util";

// Base morale drain 1.2; john ×0.5; +15 if water<=0; +10 if rations<=0; +ration penalty; +pace bonus (driving).
describe("moraleSystem", () => {
  it("base drain halved while john is alive", () => {
    const { e } = makeExpedition("m", { water: 500, rations: 500 });
    e.set(Resources, { morale: 100 });
    moraleSystem(e);
    expect(e.get(Resources)!.morale).toBeCloseTo(100 - 1.2 * 0.5, 5);
  });

  it("full base drain when john is dead", () => {
    const { e } = makeExpedition("m", { water: 500, rations: 500 });
    const crew = e.get(Crew)!;
    crew.find((c) => c.id === "john")!.alive = false;
    e.set(Crew, crew);
    e.set(Resources, { morale: 100 });
    moraleSystem(e);
    expect(e.get(Resources)!.morale).toBeCloseTo(100 - 1.2, 5);
  });

  it("adds water-zero and rations-zero spikes", () => {
    const { e } = makeExpedition("m");
    e.set(Resources, { morale: 100, water: 0, rations: 0 });
    moraleSystem(e);
    // 1.2*0.5 base + 15 (water) + 10 (rations).
    expect(e.get(Resources)!.morale).toBeCloseTo(100 - (1.2 * 0.5 + 15 + 10), 5);
  });

  it("adds ration-level penalty below filling (bare bones = +11.25)", () => {
    const { e } = makeExpedition("m", { rationLevel: "bareBones" });
    e.set(Resources, { morale: 100, water: 500, rations: 500 });
    moraleSystem(e);
    expect(e.get(Resources)!.morale).toBeCloseTo(100 - (1.2 * 0.5 + 11.25), 5);
  });

  it("adds pace morale bonus only while driving (grueling = +8)", () => {
    const { e } = makeExpedition("m", { pace: "grueling" });
    e.set(Resources, { morale: 100, water: 500, rations: 500 });
    e.set(Travel, { driving: true });
    moraleSystem(e);
    expect(e.get(Resources)!.morale).toBeCloseTo(100 - (1.2 * 0.5 + 8), 5);
  });

  it("omits the pace bonus when halted", () => {
    const { e } = makeExpedition("m", { pace: "grueling" });
    e.set(Resources, { morale: 100, water: 500, rations: 500 });
    e.set(Travel, { driving: false });
    moraleSystem(e);
    expect(e.get(Resources)!.morale).toBeCloseTo(100 - 1.2 * 0.5, 5);
  });

  it("clamps morale at zero", () => {
    const { e } = makeExpedition("m");
    e.set(Resources, { morale: 1, water: 0, rations: 0 });
    moraleSystem(e);
    expect(e.get(Resources)!.morale).toBe(0);
  });
});
