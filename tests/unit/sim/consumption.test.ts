import { describe, expect, it } from "vitest";
import { consumptionSystem } from "@/sim/systems/consumption";
import { Crew, Resources } from "@/sim/traits";
import { makeExpedition } from "./_util";

// drainPerCrew: O2 1.0, water 1.2, rations 1.2; nadia ×0.8 on water+rations; scrubbers ×0.75 O2.
describe("consumptionSystem", () => {
  it("drains vitals per living crew member (full roster, no upgrades)", () => {
    const { e } = makeExpedition("c", { oxygen: 500, water: 500, rations: 500 });
    consumptionSystem(e);
    const r = e.get(Resources)!;
    // 4 alive; nadia trait applies ×0.8 to water+rations (oxygen unaffected).
    expect(r.oxygen).toBeCloseTo(500 - 1.0 * 4, 5);
    expect(r.water).toBeCloseTo(500 - 1.2 * 4 * 0.8, 5);
    expect(r.rations).toBeCloseTo(500 - 1.2 * 4 * 0.8 * 1.0, 5);
  });

  it("scrubbers cut oxygen drain by 25%", () => {
    const { e } = makeExpedition("c", { oxygen: 500, upgrades: ["scrubbers"] });
    consumptionSystem(e);
    expect(e.get(Resources)!.oxygen).toBeCloseTo(500 - 1.0 * 4 * 0.75, 5);
  });

  it("dead nadia removes the consumption discount", () => {
    const { e } = makeExpedition("c", { water: 500 });
    const crew = e.get(Crew)!;
    crew.find((c) => c.id === "nadia")!.alive = false;
    e.set(Crew, crew);
    consumptionSystem(e);
    // 3 alive, no ×0.8.
    expect(e.get(Resources)!.water).toBeCloseTo(500 - 1.2 * 3, 5);
  });

  it("ration level scales ration burn (bare bones ×0.25)", () => {
    const { e } = makeExpedition("c", { rations: 500, rationLevel: "bareBones" });
    consumptionSystem(e);
    expect(e.get(Resources)!.rations).toBeCloseTo(500 - 1.2 * 4 * 0.8 * 0.25, 5);
  });

  it("microHydroponics adds rations each Sol", () => {
    const { e } = makeExpedition("c", { rations: 500, upgrades: ["microHydroponics"] });
    consumptionSystem(e);
    expect(e.get(Resources)!.rations).toBeCloseTo(500 - 1.2 * 4 * 0.8 + 2, 5);
  });

  it("clamps vitals at zero, never negative", () => {
    const { e } = makeExpedition("c", { oxygen: 1, water: 1, rations: 1 });
    consumptionSystem(e);
    const r = e.get(Resources)!;
    expect(r.oxygen).toBe(0);
    expect(r.water).toBe(0);
    expect(r.rations).toBe(0);
  });

  it("no-ops when all crew are dead", () => {
    const { e } = makeExpedition("c", { oxygen: 500 });
    const crew = e.get(Crew)!;
    for (const c of crew) c.alive = false;
    e.set(Crew, crew);
    consumptionSystem(e);
    expect(e.get(Resources)!.oxygen).toBe(500);
  });
});
