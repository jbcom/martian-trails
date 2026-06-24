import { describe, expect, it } from "vitest";
import { weatherSystem } from "@/sim/systems/weather";
import { Position, Travel, Weather } from "@/sim/traits";
import { makeExpedition } from "./_util";

describe("weatherSystem — the dust-storm state machine", () => {
  it("never kicks up a storm before the onset min distance", () => {
    const { e } = makeExpedition("w");
    e.set(Position, { distance: 50 }); // below weather.onsetMinDistance (100)
    for (let sol = 1; sol < 200; sol++) {
      e.set(Position, { distance: 50, sol });
      weatherSystem(e);
      expect(e.get(Weather)!.kind).toBe("clear");
    }
  });

  it("does not evolve weather while halted", () => {
    const { e } = makeExpedition("w");
    e.set(Position, { distance: 1000, sol: 5 });
    e.set(Travel, { driving: false });
    weatherSystem(e);
    expect(e.get(Weather)!.kind).toBe("clear");
  });

  it("is deterministic for a given seed (same Sol → same weather draw)", () => {
    const runs = [0, 1].map(() => {
      const { e } = makeExpedition("fixed-weather-seed");
      e.set(Position, { distance: 800, sol: 9 });
      weatherSystem(e);
      return e.get(Weather)!.kind;
    });
    expect(runs[0]).toBe(runs[1]);
  });

  it("DOES kick up a dust storm on some Sol past the onset distance", () => {
    // The scaffold never set dust_storm; prove the sim now actually triggers it.
    let stormed = false;
    for (let sol = 1; sol < 400 && !stormed; sol++) {
      const { e } = makeExpedition("storm-sweep");
      e.set(Position, { distance: 800, sol });
      e.set(Weather, { kind: "clear" });
      weatherSystem(e);
      if (e.get(Weather)!.kind === "dust_storm") stormed = true;
    }
    expect(stormed).toBe(true);
  });

  it("an active storm eventually blows over (can clear)", () => {
    let cleared = false;
    for (let sol = 1; sol < 400 && !cleared; sol++) {
      const { e } = makeExpedition("clear-sweep");
      e.set(Position, { distance: 800, sol });
      e.set(Weather, { kind: "dust_storm" });
      weatherSystem(e);
      if (e.get(Weather)!.kind === "clear") cleared = true;
    }
    expect(cleared).toBe(true);
  });
});
