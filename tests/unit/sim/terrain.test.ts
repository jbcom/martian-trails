import { describe, expect, it } from "vitest";
import { terrainSystem } from "@/sim/systems/terrain";
import { Position, Terrain, Travel } from "@/sim/traits";
import { makeExpedition } from "./_util";

describe("terrainSystem", () => {
  it("does not change zone before the min distance", () => {
    const { e } = makeExpedition("z");
    e.set(Position, { distance: 50 }); // below zoneChangeMinDistance (100)
    terrainSystem(e);
    expect(e.get(Terrain)!.zone).toBe(0);
  });

  it("does not change zone while halted", () => {
    const { e } = makeExpedition("z");
    e.set(Position, { distance: 500 });
    e.set(Travel, { driving: false });
    terrainSystem(e);
    expect(e.get(Terrain)!.zone).toBe(0);
  });

  it("is deterministic for a given seed (same Sol → same zone choice)", () => {
    const runs = [0, 1].map(() => {
      const { e } = makeExpedition("fixed-seed");
      e.set(Position, { distance: 500, sol: 7 });
      terrainSystem(e);
      return e.get(Terrain)!.zone;
    });
    expect(runs[0]).toBe(runs[1]);
  });

  it("when it switches, it picks a different zone", () => {
    // Sweep Sols until a switch fires, then assert the new zone differs from the start.
    let switched = false;
    for (let sol = 1; sol < 60 && !switched; sol++) {
      const { e } = makeExpedition("sweep");
      e.set(Position, { distance: 500, sol });
      e.set(Terrain, { zone: 0 });
      terrainSystem(e);
      const z = e.get(Terrain)!.zone;
      if (z !== 0) {
        expect(z).toBeGreaterThan(0);
        switched = true;
      }
    }
    expect(switched).toBe(true);
  });
});
