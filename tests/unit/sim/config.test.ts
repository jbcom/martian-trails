import { describe, expect, it } from "vitest";
import { config } from "@/config";

// The loader validates on import; these assertions pin the canonical balance numbers from
// the frozen POC so a future config edit that drifts from the design is caught here.
describe("config — canonical POC balance numbers", () => {
  it("resources max + drain + RTG power", () => {
    expect(config.resources.max).toEqual({
      oxygen: 1000,
      water: 1000,
      rations: 1000,
      power: 100,
      morale: 100,
      hull: 100,
    });
    expect(config.resources.drainPerCrew).toEqual({
      oxygen: 1.0,
      water: 1.2,
      rations: 1.2,
      morale: 1.2,
    });
    expect(config.resources.maxPowerPerRtg).toBe(100);
  });

  it("travel constants", () => {
    expect(config.travel.totalDistance).toBe(2500);
    expect(config.travel.baseSpeed).toBe(35);
    expect(config.travel.powerDrainDriving).toBe(6);
    expect(config.travel.recharge).toEqual({ clear: 25, storm: 2 });
    expect(config.travel.lowHull).toEqual({ threshold: 30, powerMult: 1.5 });
  });

  it("pace presets", () => {
    expect(config.travel.pace.steady.speedMult).toBe(1.0);
    expect(config.travel.pace.strenuous.speedMult).toBe(1.5);
    expect(config.travel.pace.grueling.speedMult).toBe(2.0);
    expect(config.travel.pace.steady.eventChance).toBe(0.12);
    expect(config.travel.pace.strenuous.eventChance).toBe(0.18);
    expect(config.travel.pace.grueling.eventChance).toBe(0.25);
  });

  it("ration presets", () => {
    expect(config.travel.rations.filling.consumptionMult).toBe(1.0);
    expect(config.travel.rations.meager.consumptionMult).toBe(0.5);
    expect(config.travel.rations.bareBones.consumptionMult).toBe(0.25);
  });

  it("terrain zones incl. the un-stubbed Hardpan Rock", () => {
    const byName = Object.fromEntries(config.terrain.zones.map((z) => [z.name, z]));
    expect(byName["Smooth Regolith"]).toMatchObject({
      speed: 1.0,
      power: 1.0,
      hullDamage: 0.5,
      color: "#cc7052",
    });
    expect(byName["Boulder Field"]).toMatchObject({
      speed: 0.6,
      power: 1.5,
      hullDamage: 2.5,
      color: "#8a3324",
    });
    expect(byName["Deep Sand"]).toMatchObject({
      speed: 0.4,
      power: 1.8,
      hullDamage: 0.8,
      color: "#a85b32",
    });
    expect(byName["Hardpan Rock"]).toMatchObject({
      speed: 0.9,
      power: 1.1,
      hullDamage: 1.5,
      color: "#9c6b4a",
    });
  });

  it("outposts at canonical distances", () => {
    expect(config.terrain.outposts).toEqual([
      { name: "Tharsis Outpost", distance: 600 },
      { name: "Pavonis Mons Base", distance: 1300 },
      { name: "Noctis Labyrinthus", distance: 2000 },
    ]);
  });

  it("store catalog prices/steps/max/bulk + RTG start qty", () => {
    const byId = Object.fromEntries(config.store.items.map((i) => [i.id, i]));
    expect(byId.oxygen).toMatchObject({
      price: 10,
      step: 50,
      max: 1000,
      isBulk: true,
      startQty: 0,
    });
    expect(byId.water).toMatchObject({ price: 5, step: 50, max: 1000, isBulk: true });
    expect(byId.rations).toMatchObject({ price: 8, step: 50, max: 1000, isBulk: true });
    expect(byId.parts).toMatchObject({ price: 250, step: 1, max: 15, isBulk: false });
    expect(byId.medkits).toMatchObject({ price: 400, step: 1, max: 10, isBulk: false });
    expect(byId.rtg).toMatchObject({ price: 3000, step: 1, max: 4, isBulk: false, startQty: 1 });
    expect(config.store.budget).toBe(25000);
    expect(config.store.payloadCap).toBe(1000);
  });

  it("upgrades catalog incl. the un-overloaded aerogel + microHydroponics", () => {
    const ids = config.upgrades.catalog.map((u) => u.id);
    expect(ids).toEqual(
      expect.arrayContaining(["scrubbers", "suspension", "solar", "aerogel", "microHydroponics"]),
    );
    expect(config.upgrades.catalog.find((u) => u.id === "scrubbers")?.cost).toBe(3);
    expect(config.upgrades.catalog.find((u) => u.id === "suspension")?.cost).toBe(4);
    expect(config.upgrades.catalog.find((u) => u.id === "solar")?.cost).toBe(3);
    expect(config.upgrades.effects.scrubbersOxygenMult).toBe(0.75);
    expect(config.upgrades.effects.suspensionDamageMult).toBe(0.7);
    expect(config.upgrades.effects.suspensionEventMult).toBe(0.5);
    expect(config.upgrades.effects.solarRechargeMult).toBe(1.4);
    expect(config.upgrades.effects.aerogelColdMult).toBe(0.5);
    expect(config.upgrades.effects.hydroponicsRationsPerSol).toBe(2);
  });

  it("crew roster + documented passive traits", () => {
    const byId = Object.fromEntries(config.crew.roster.map((m) => [m.id, m]));
    expect(byId.nadia.traits.consumptionMult).toBe(0.8);
    expect(byId.john.traits.moraleDrainMult).toBe(0.5);
    expect(byId.maya.traits.partSaveChance).toBe(0.3);
    expect(byId.maya.traits.hullRepairBonus).toBe(15);
    expect(byId.frank.traits.evaYieldMult).toBe(2);
  });

  it("scoring coefficients", () => {
    expect(config.scoring).toEqual({
      base: 1000,
      perSurvivor: 500,
      resourceDivisor: 5,
      perSol: 15,
      floor: 0,
    });
  });
});
