import { describe, expect, it } from "vitest";
import { solDistance, travelSystem } from "@/sim/systems/travel";
import { Position, Terrain, Travel } from "@/sim/traits";
import { makeExpedition } from "./_util";

// distance/Sol = baseSpeed(35) * pace.speedMult * terrain.speed.
describe("travelSystem", () => {
  it("advances distance by baseSpeed × pace × terrain.speed (steady + smooth = 35)", () => {
    const { e } = makeExpedition("t");
    travelSystem(e);
    expect(e.get(Position)!.distance).toBeCloseTo(35, 5);
  });

  it("grueling on deep sand: 35 × 2 × 0.4 = 28 km/Sol", () => {
    const { e } = makeExpedition("t", { pace: "grueling" });
    e.set(Terrain, { zone: 2 });
    e.set(Travel, { driving: true });
    travelSystem(e);
    expect(e.get(Position)!.distance).toBeCloseTo(28, 5);
  });

  it("does not move when halted", () => {
    const { e } = makeExpedition("t");
    e.set(Travel, { driving: false });
    travelSystem(e);
    expect(e.get(Position)!.distance).toBe(0);
  });

  it("advances the outpost cursor when a waypoint is crossed", () => {
    const { e } = makeExpedition("t");
    e.set(Position, { distance: 590, nextOutpost: 0 }); // Tharsis @ 600
    travelSystem(e);
    expect(e.get(Position)!.distance).toBeGreaterThanOrEqual(600);
    expect(e.get(Position)!.nextOutpost).toBe(1);
  });

  it("skips multiple outposts in a single long Sol", () => {
    const { e } = makeExpedition("t");
    e.set(Position, { distance: 595, nextOutpost: 0 });
    // Force a huge leg by hand to cross two outposts.
    e.set(Travel, { driving: true });
    e.set(Position, { distance: 1295, nextOutpost: 1 }); // already past Tharsis; Pavonis @ 1300
    travelSystem(e);
    expect(e.get(Position)!.nextOutpost).toBe(2);
  });

  it("solDistance is a pure km/Sol helper", () => {
    expect(solDistance("steady", 0)).toBeCloseTo(35, 5);
    expect(solDistance("strenuous", 1)).toBeCloseTo(35 * 1.5 * 0.6, 5);
  });
});
