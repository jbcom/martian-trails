import { describe, expect, it } from "vitest";
import { config } from "@/config";
import { createRng } from "@/core/rng";
import {
  drill,
  type EvaSession,
  endEva,
  heatForDistance,
  isCarryFull,
  scan,
  startEva,
} from "@/sim/eva";

/** Find a live deposit cell in a session (for deterministic drill tests). */
function liveDeposit(session: EvaSession) {
  return session.deposits.find((d) => d.remaining > 0)!;
}

describe("eva config", () => {
  it("loads the O₂ economy, carry cap, and deposit types", () => {
    expect(config.eva.o2Budget).toBeGreaterThan(0);
    expect(config.eva.carryCap).toBeGreaterThan(0);
    const ids = config.eva.deposits.map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["ice", "ore", "sample"]));
    expect(config.eva.deposits.find((d) => d.id === "ice")?.resource).toBe("water");
    expect(config.eva.deposits.find((d) => d.id === "ore")?.resource).toBe("parts");
  });
});

describe("startEva — seeded deposit field", () => {
  it("seeds the same field for the same seed (determinism)", () => {
    const a = startEva(createRng("eva-seed"), 100);
    const b = startEva(createRng("eva-seed"), 100);
    expect(a.deposits).toEqual(b.deposits);
  });

  it("caps the O₂ budget at the rover's available O₂", () => {
    const low = startEva(createRng("x"), 30);
    expect(low.o2).toBe(30);
    const ample = startEva(createRng("x"), 999);
    expect(ample.o2).toBe(config.eva.o2Budget);
  });

  it("places depositCount deposits on distinct cells", () => {
    const s = startEva(createRng("field"), 100);
    expect(s.deposits.length).toBe(config.eva.depositCount);
    const keys = new Set(s.deposits.map((d) => `${d.x},${d.y}`));
    expect(keys.size).toBe(s.deposits.length);
  });
});

describe("heatForDistance", () => {
  it("maps Chebyshev distance to hot/warm/cold/none", () => {
    expect(heatForDistance(0)).toBe("hot");
    expect(heatForDistance(1)).toBe("hot");
    expect(heatForDistance(2)).toBe("warm");
    expect(heatForDistance(4)).toBe("cold");
    expect(heatForDistance(null)).toBe("none");
  });
});

describe("scan — costs O₂ and reveals heat", () => {
  it("spends scan + ambient O₂ and reads hot on a deposit cell", () => {
    const s = startEva(createRng("scan"), 100);
    const dep = liveDeposit(s);
    const { session, heat } = scan(s, dep.x, dep.y);
    expect(heat).toBe("hot");
    expect(session.o2).toBe(100 - config.eva.scanCost - config.eva.ambientDrainPerAction);
    expect(session.deposits.find((d) => d.x === dep.x && d.y === dep.y)?.found).toBe(true);
  });

  it("is a no-op when O₂ can't cover the cost", () => {
    const s = { ...startEva(createRng("scan2"), 100), o2: 1 };
    const { session, heat } = scan(s, 0, 0);
    expect(heat).toBe("none");
    expect(session.o2).toBe(1);
  });
});

describe("drill — extracts yield, respects carry cap", () => {
  it("banks the deposit's yield + mass + score on a hit", () => {
    const s = startEva(createRng("drill"), 100);
    const dep = liveDeposit(s);
    const type = config.eva.deposits.find((d) => d.id === dep.typeId)!;
    const { session, hit } = drill(s, dep.x, dep.y);
    expect(hit).toBe(true);
    expect(session.haul.mass).toBe(type.mass);
    expect(session.haul.score).toBe(type.score);
    if (type.resource === "water") expect(session.haul.water).toBe(type.yield);
    if (type.resource === "parts") expect(session.haul.parts).toBe(type.yield);
    expect(session.haul.drills).toBe(1);
  });

  it("a dry cell burns O₂ but banks nothing", () => {
    const s = startEva(createRng("dry"), 100);
    // Find a cell with no deposit.
    let empty: { x: number; y: number } | null = null;
    for (let y = 0; y < s.gridSize && !empty; y++) {
      for (let x = 0; x < s.gridSize && !empty; x++) {
        if (!s.deposits.some((d) => d.x === x && d.y === y)) empty = { x, y };
      }
    }
    const { session, hit } = drill(s, empty!.x, empty!.y);
    expect(hit).toBe(false);
    expect(session.haul.mass).toBe(0);
    expect(session.o2).toBeLessThan(100);
  });

  it("locks drilling once the carry cap is reached", () => {
    let s = startEva(createRng("cap"), 999);
    // Force the haul to the cap.
    s = { ...s, haul: { ...s.haul, mass: config.eva.carryCap } };
    expect(isCarryFull(s)).toBe(true);
    const dep = liveDeposit(s);
    const { session, hit } = drill(s, dep.x, dep.y);
    expect(hit).toBe(false);
    expect(session.o2).toBe(s.o2); // no O₂ spent when locked
  });

  it("is deterministic — same seed + actions → identical session", () => {
    const play = () => {
      let s = startEva(createRng("det"), 100);
      const dep = liveDeposit(s);
      s = scan(s, dep.x, dep.y).session;
      s = drill(s, dep.x, dep.y).session;
      // The rng is a live closure (not deep-equal across instances); compare the
      // observable session state only.
      const { rng: _rng, ...rest } = s;
      return rest;
    };
    expect(play()).toEqual(play());
  });
});

describe("over-stay injury risk", () => {
  it("fires injury rolls only at/below the O₂ threshold", () => {
    // Above threshold: no injury across many actions.
    let safe = startEva(createRng("safe"), 100);
    let injuredAboveThreshold = false;
    for (let i = 0; i < 5; i++) {
      const r = scan(safe, i % safe.gridSize, 0);
      safe = r.session;
      if (r.injured) injuredAboveThreshold = true;
      if (safe.o2 <= config.eva.injuryO2Threshold) break;
    }
    expect(injuredAboveThreshold).toBe(false);

    // Low O₂: at least one seed produces an injury roll.
    let everInjured = false;
    for (let seed = 0; seed < 40 && !everInjured; seed++) {
      const s = { ...startEva(createRng(`low-${seed}`), 100), o2: config.eva.injuryO2Threshold };
      const r = scan(s, 0, 0);
      if (r.injured) everInjured = true;
    }
    expect(everInjured).toBe(true);
  });
});

describe("endEva", () => {
  it("marks the session ended (haul banked by the controller)", () => {
    const s = startEva(createRng("end"), 100);
    expect(endEva(s).ended).toBe(true);
  });
});
