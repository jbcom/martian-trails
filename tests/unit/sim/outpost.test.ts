import { describe, expect, it } from "vitest";
import { config } from "@/config";
import { adviceForOutpost, allOutpostAdvicePairs } from "@/content/outpostAdvice";
import type { OutpostStop } from "@/sim/outpost";
import {
  canAfford,
  resolveOutpostAdviceChoice,
  resolveRest,
  resolveTrade,
  serviceForOutpost,
  tradeChips,
} from "@/sim/outpost";

/** A full resource snapshot for the pure resolvers. */
const RES = {
  oxygen: 500,
  water: 500,
  rations: 500,
  power: 80,
  morale: 40,
  hull: 50,
  parts: 5,
  medkits: 3,
};

/** Build an OutpostStop bound to a named, configured outpost. */
function stopFor(name: string): OutpostStop {
  const service = serviceForOutpost(name);
  if (!service) throw new Error(`no service for ${name}`);
  const wp = config.terrain.outposts.find((o) => o.name === name)!;
  return { name, distance: wp.distance, service };
}

describe("outpost services (pure resolution)", () => {
  it("binds a service to every terrain outpost waypoint", () => {
    for (const wp of config.terrain.outposts) {
      expect(serviceForOutpost(wp.name)).toBeDefined();
    }
  });

  it("resolveRest heals morale/hull and pays the vitals upkeep, clamped to maxima", () => {
    const stop = stopFor("Tharsis Outpost");
    const patch = resolveRest(stop, RES, config.resources.max.power);
    // Morale heal lands but never exceeds the cap.
    expect(patch.morale).toBeGreaterThan(RES.morale);
    expect(patch.morale).toBeLessThanOrEqual(config.resources.max.morale);
    // Hull repaired upward.
    expect(patch.hull).toBeGreaterThan(RES.hull);
    // Water/rations upkeep paid (down from baseline).
    expect(patch.water).toBeLessThan(RES.water);
  });

  it("canAfford rejects a trade the crew can't pay", () => {
    const stop = stopFor("Pavonis Mons Base");
    // The water→parts trade costs 200 Water; with only 100 on hand it's unaffordable.
    const offer = stop.service.trades.find((t) => t.id === "water-parts")!;
    expect(canAfford(offer, { ...RES, water: 100 })).toBe(false);
    expect(canAfford(offer, { ...RES, water: 250 })).toBe(true);
  });

  it("resolveTrade returns null when unaffordable and a patch when affordable", () => {
    const stop = stopFor("Tharsis Outpost");
    const offer = stop.service.trades.find((t) => t.id === "parts-water")!; // −2 Parts → +150 Water
    expect(resolveTrade(offer, { ...RES, parts: 1 }, config.resources.max.power)).toBeNull();
    const patch = resolveTrade(offer, RES, config.resources.max.power);
    expect(patch).not.toBeNull();
    expect(patch?.parts).toBe(RES.parts - 2);
    expect(patch?.water).toBeGreaterThan(RES.water);
  });

  it("tradeChips splits give-side from get-side effects", () => {
    const stop = stopFor("Noctis Labyrinthus");
    const offer = stop.service.trades[0];
    const { give, get } = tradeChips(offer);
    expect(give.every((e) => e.delta < 0)).toBe(true);
    expect(get.every((e) => e.delta > 0)).toBe(true);
  });

  it("binds a conflicting advice pair to every terrain outpost", () => {
    expect(allOutpostAdvicePairs()).toHaveLength(config.terrain.outposts.length);
    for (const wp of config.terrain.outposts) {
      const pair = adviceForOutpost(wp.name);
      expect(pair?.veteran.role).toBe("veteran");
      expect(pair?.liaison.role).toBe("liaison");
      expect(pair?.choices.map((choice) => choice.advisorId).sort()).toEqual(
        [pair?.liaison.id, pair?.veteran.id].sort(),
      );
    }
  });

  it("resolveOutpostAdviceChoice applies the chosen route-prep effect and emits a flag", () => {
    const pair = adviceForOutpost("Tharsis Outpost")!;
    const result = resolveOutpostAdviceChoice(pair, "veteran", RES, config.resources.max.power);
    expect(result).not.toBeNull();
    expect(result?.flag).toBe("flag:advice:tharsis:veteran");
    expect(result?.resources).not.toEqual(RES);
    expect(() =>
      resolveOutpostAdviceChoice(pair, "missing", RES, config.resources.max.power),
    ).toThrow(/unknown outpost advice choice/);
  });
});
