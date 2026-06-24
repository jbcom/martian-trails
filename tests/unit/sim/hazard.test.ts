import { describe, expect, it } from "vitest";
import { config } from "@/config";
import { createRng } from "@/core/rng";
import type { EventResources } from "@/sim/event";
import { findHazard, resolveHazard, scaledWeight } from "@/sim/hazard";

const FULL: EventResources = {
  oxygen: 1000,
  water: 1000,
  rations: 1000,
  power: 100,
  morale: 100,
  hull: 100,
  parts: 10,
  medkits: 5,
};

describe("hazard config", () => {
  it("loads 5 hazard families with distinct kinds at fixed route km", () => {
    const kinds = config.hazards.hazards.map((h) => h.kind);
    expect(new Set(kinds)).toEqual(
      new Set(["crevasse", "dustStorm", "regolithBog", "iceSheet", "scarp"]),
    );
    // Each has 3–4 options and a read label.
    for (const h of config.hazards.hazards) {
      expect(h.options.length).toBeGreaterThanOrEqual(3);
      expect(h.options.length).toBeLessThanOrEqual(4);
      expect(h.readLabel.length).toBeGreaterThan(0);
      expect(h.distance).toBeGreaterThan(0);
    }
  });

  it("findHazard resolves by id", () => {
    expect(findHazard("noctis-chasma")?.name).toBe("Noctis Chasma");
    expect(findHazard("nope")).toBeUndefined();
  });
});

describe("scaledWeight — read-stat tilt", () => {
  const hazard = findHazard("noctis-chasma")!;
  const ford = hazard.options.find((o) => o.id === "ford")!;
  const success = ford.outcomes.find((o) => o.tier === "success")!;
  const fail = ford.outcomes.find((o) => o.tier === "fail")!;

  it("a worse read shrinks success weight and grows fail weight", () => {
    expect(scaledWeight(success, 0.9)).toBeLessThan(scaledWeight(success, 0.1));
    expect(scaledWeight(fail, 0.9)).toBeGreaterThan(scaledWeight(fail, 0.1));
  });

  it("never returns a negative weight even at read=1 with strong negative scaling", () => {
    for (const o of ford.outcomes) {
      expect(scaledWeight(o, 1)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("resolveHazard — pure resolution", () => {
  const hazard = findHazard("noctis-chasma")!;

  it("is deterministic — same hazard/option/read/rng-seed → identical result", () => {
    const r1 = resolveHazard(hazard, "ford", 0.5, FULL, createRng("hz"), 100);
    const r2 = resolveHazard(hazard, "ford", 0.5, FULL, createRng("hz"), 100);
    expect(r1).toEqual(r2);
  });

  it("applies the bridge upfront Parts cost on every outcome", () => {
    // Bridge always costs 3 parts upfront; the patch must reflect parts = 10 - 3 = 7
    // (minus any extra parts loss on a bad band).
    const r = resolveHazard(hazard, "bridge", 0.5, FULL, createRng("br"), 100);
    expect(r.patch.parts).toBeLessThanOrEqual(7);
    expect(r.optionId).toBe("bridge");
  });

  it("charges Sols + distance per the chosen outcome", () => {
    // Detour is a single deterministic band: +3 upfront Sols, −8 km, −20 power upfront.
    const r = resolveHazard(hazard, "detour", 0.5, FULL, createRng("dt"), 100);
    expect(r.tier).toBe("success");
    expect(r.solsCost).toBe(3);
    expect(r.distanceDelta).toBe(-8);
    expect(r.patch.power).toBe(80);
  });

  it("clamps resource deltas to pool maxima (morale never exceeds 100)", () => {
    // Winch success gives +6 morale; from 100 it must clamp to 100.
    const r = resolveHazard(hazard, "winch", 0.2, FULL, createRng("wn"), 100);
    if (r.patch.morale !== undefined) expect(r.patch.morale).toBeLessThanOrEqual(100);
  });

  it("a high read pushes Ford toward partial/fail outcomes across seeds", () => {
    let bad = 0;
    for (let i = 0; i < 60; i++) {
      const r = resolveHazard(hazard, "ford", 0.95, FULL, createRng(`hi-${i}`), 100);
      if (r.tier !== "success") bad++;
    }
    // With a near-max read, fords should frequently go wrong.
    expect(bad).toBeGreaterThan(20);
  });

  it("a low read keeps Ford mostly successful across seeds", () => {
    let good = 0;
    for (let i = 0; i < 60; i++) {
      const r = resolveHazard(hazard, "ford", 0.1, FULL, createRng(`lo-${i}`), 100);
      if (r.tier === "success") good++;
    }
    expect(good).toBeGreaterThan(30);
  });

  it("throws on an unknown option id", () => {
    expect(() => resolveHazard(hazard, "teleport", 0.5, FULL, createRng("x"), 100)).toThrow();
  });
});
