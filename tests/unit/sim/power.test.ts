import { describe, expect, it } from "vitest";
import { powerSystem, solTemperature } from "@/sim/systems/power";
import { MaxResources, Resources, Terrain, Travel, Weather } from "@/sim/traits";
import { makeExpedition } from "./_util";

// drain = 6 * pace² * terrain.power; ×1.5 if hull<30; +cold; recharge clear 25 / storm 2; solar ×1.4.
describe("powerSystem", () => {
  it("drains by pace² × terrain.power, then recharges on a clear Sol", () => {
    const { e } = makeExpedition("p");
    e.set(Resources, { power: 80, hull: 100 }); // steady (1), smooth regolith (power 1.0)
    powerSystem(e);
    // drain = 6*1*1 = 6; recharge clear = 25; 80-6+25 = 99.
    expect(e.get(Resources)!.power).toBeCloseTo(99, 5);
  });

  it("pace² makes grueling cost 4× the base drain", () => {
    const { e } = makeExpedition("p", { pace: "grueling" });
    e.set(Resources, { power: 80, hull: 100 });
    e.set(Travel, { driving: true });
    powerSystem(e);
    // drain = 6 * 2² * 1.0 = 24; +25 recharge; 80-24+25 = 81.
    expect(e.get(Resources)!.power).toBeCloseTo(81, 5);
  });

  it("terrain.power multiplies drain (deep sand 1.8)", () => {
    const { e } = makeExpedition("p");
    e.set(Resources, { power: 80, hull: 100 });
    e.set(Terrain, { zone: 2 }); // deep sand
    powerSystem(e);
    // drain = 6*1*1.8 = 10.8; 80-10.8+25 = 94.2.
    expect(e.get(Resources)!.power).toBeCloseTo(94.2, 5);
  });

  it("low hull (<30) multiplies drain by 1.5", () => {
    const { e } = makeExpedition("p");
    e.set(Resources, { power: 80, hull: 20 });
    powerSystem(e);
    // drain = 6*1*1 *1.5 = 9; 80-9+25 = 96.
    expect(e.get(Resources)!.power).toBeCloseTo(96, 5);
  });

  it("dust storm cuts recharge to 2 and adds cold drain", () => {
    const { e } = makeExpedition("p");
    e.set(Resources, { power: 50, hull: 100 });
    e.set(Weather, { kind: "dust_storm" });
    powerSystem(e);
    // temp = -80 → cold = |−80 − (−60)| * 0.02 = 0.4; drain = 6 + 0.4 = 6.4; recharge storm 2.
    expect(e.get(Resources)!.power).toBeCloseTo(50 - 6.4 + 2, 5);
  });

  it("aerogel halves the cold-snap surcharge", () => {
    const { e } = makeExpedition("p", { upgrades: ["aerogel"] });
    e.set(Resources, { power: 50, hull: 100 });
    e.set(Weather, { kind: "dust_storm" });
    powerSystem(e);
    // cold = 0.4 * 0.5 = 0.2; drain = 6.2; recharge 2.
    expect(e.get(Resources)!.power).toBeCloseTo(50 - 6.2 + 2, 5);
  });

  it("solar boosts clear-Sol recharge by 40%", () => {
    const { e } = makeExpedition("p", { upgrades: ["solar"] });
    e.set(Resources, { power: 50, hull: 100 });
    e.set(Travel, { driving: false }); // isolate recharge
    powerSystem(e);
    expect(e.get(Resources)!.power).toBeCloseTo(50 + 25 * 1.4, 5);
  });

  it("solar does not apply during a storm", () => {
    const { e } = makeExpedition("p", { upgrades: ["solar"] });
    e.set(Resources, { power: 50, hull: 100 });
    e.set(Weather, { kind: "dust_storm" });
    e.set(Travel, { driving: false });
    powerSystem(e);
    expect(e.get(Resources)!.power).toBeCloseTo(50 + 2, 5);
  });

  it("only recharges (no drain) when halted", () => {
    const { e } = makeExpedition("p");
    e.set(Resources, { power: 50, hull: 100 });
    e.set(Travel, { driving: false });
    powerSystem(e);
    expect(e.get(Resources)!.power).toBeCloseTo(75, 5);
  });

  it("caps power at the (RTG-derived) max", () => {
    const { e } = makeExpedition("p", { rtg: 1 });
    e.set(Resources, { power: 95, hull: 100 });
    e.set(Travel, { driving: false });
    powerSystem(e);
    expect(e.get(Resources)!.power).toBe(e.get(MaxResources)!.power);
    expect(e.get(Resources)!.power).toBe(100);
  });

  it("solTemperature drops 20° in a storm", () => {
    expect(solTemperature("clear")).toBe(-60);
    expect(solTemperature("dust_storm")).toBe(-80);
  });
});
