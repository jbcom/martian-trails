import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import { defaultLoadout, spawnExpedition } from "@/sim/factories";
import { advanceSol, SECONDS_PER_SOL, step } from "@/sim/tick";
import { Crew, Outcome, Position, Resources } from "@/sim/traits";
import { makeExpedition } from "./_util";

/** Snapshot the full mutable run state for determinism comparison. */
function snapshot(e: ReturnType<typeof makeExpedition>["e"]): string {
  return JSON.stringify({
    res: e.get(Resources),
    pos: e.get(Position),
    crew: e.get(Crew),
    outcome: e.get(Outcome),
  });
}

describe("advanceSol — one full Sol pass", () => {
  it("increments the Sol counter and drains resources", () => {
    const { e } = makeExpedition("tick");
    const o2 = e.get(Resources)!.oxygen;
    advanceSol(e);
    expect(e.get(Position)!.sol).toBe(2);
    expect(e.get(Resources)!.oxygen).toBeLessThan(o2);
  });

  it("stops advancing once the run is decided", () => {
    const { e } = makeExpedition("tick");
    e.set(Outcome, { status: "won" });
    const before = e.get(Position)!.sol;
    advanceSol(e);
    expect(e.get(Position)!.sol).toBe(before);
  });
});

describe("determinism", () => {
  it("same seed + loadout → identical state after many Sols", () => {
    const run = (seed: string) => {
      const w = createWorld();
      const e = spawnExpedition(w, seed, defaultLoadout());
      for (let i = 0; i < 60; i++) advanceSol(e);
      return snapshot(e);
    };
    expect(run("alpha")).toEqual(run("alpha"));
  });

  it("different seeds diverge over a long run", () => {
    const run = (seed: string) => {
      const w = createWorld();
      const e = spawnExpedition(w, seed, {
        ...defaultLoadout(),
        oxygen: 1000,
        water: 1000,
        rations: 1000,
      });
      for (let i = 0; i < 100; i++) advanceSol(e);
      return snapshot(e);
    };
    expect(run("alpha")).not.toEqual(run("beta"));
  });
});

describe("step — fixed-timestep Sol clock", () => {
  it("advances one Sol per SECONDS_PER_SOL of accumulated dt", () => {
    const { world, e } = makeExpedition("step");
    const sols = step(world, SECONDS_PER_SOL);
    expect(sols).toBe(1);
    expect(e.get(Position)!.sol).toBe(2);
  });

  it("accumulates sub-Sol dt across calls", () => {
    const { world, e } = makeExpedition("step");
    expect(step(world, SECONDS_PER_SOL / 2)).toBe(0);
    expect(e.get(Position)!.sol).toBe(1);
    expect(step(world, SECONDS_PER_SOL / 2)).toBe(1);
    expect(e.get(Position)!.sol).toBe(2);
  });

  it("advances multiple Sols when fed a large dt", () => {
    const { world, e } = makeExpedition("step", { oxygen: 1000, water: 1000, rations: 1000 });
    const sols = step(world, SECONDS_PER_SOL * 3);
    expect(sols).toBe(3);
    expect(e.get(Position)!.sol).toBe(4);
  });

  it("halts the Sol clock when the run ends mid-batch", () => {
    const { world, e } = makeExpedition("step", { oxygen: 4, water: 4, rations: 4 });
    // Tiny vitals → asphyxiation within a couple Sols even with a big dt.
    step(world, SECONDS_PER_SOL * 100);
    expect(e.get(Outcome)!.status).toBe("lost");
    // It must not have run all 100 Sols.
    expect(e.get(Position)!.sol).toBeLessThan(20);
  });
});

describe("full-run lose/win integration", () => {
  it("a starved expedition loses (oxygen → asphyxiation)", () => {
    const { e } = makeExpedition("starve", { oxygen: 20, water: 1000, rations: 1000 });
    for (let i = 0; i < 30 && e.get(Outcome)!.status === "running"; i++) advanceSol(e);
    expect(e.get(Outcome)!.status).toBe("lost");
    expect(e.get(Outcome)!.reason).toContain("Asphyxiation");
  });

  it("a well-stocked steady run reaches Korolev and scores", () => {
    // Steady covers up to 35 km/Sol; 2500 km takes ~70+ Sols, so morale drain must stay low
    // (steady pace adds no morale bonus). Stock heavily and recharge with solar.
    const { e } = makeExpedition("win", {
      oxygen: 1000,
      water: 1000,
      rations: 1000,
      rtg: 4,
      pace: "steady",
      upgrades: ["solar", "scrubbers", "suspension"],
    });
    for (let i = 0; i < 400 && e.get(Outcome)!.status === "running"; i++) advanceSol(e);
    expect(e.get(Outcome)!.status).toBe("won");
    expect(e.get(Outcome)!.score).toBeGreaterThan(0);
  });
});
