import { beforeEach, describe, expect, it } from "vitest";
import { run } from "@/sim/run";
import { SECONDS_PER_SOL } from "@/sim/tick";
import { getDiagnostics } from "@/state/diagnostics";

const LOADOUT = {
  oxygen: 800,
  water: 800,
  rations: 800,
  parts: 8,
  medkits: 4,
  rtg: 4,
  upgrades: [] as string[],
};

/** Tick `seconds` of wall-clock in realistic ~60fps frames (production cadence). */
function tickFrames(seconds: number) {
  const frame = 1 / 60;
  for (let t = 0; t < seconds; t += frame) run.tick(frame);
}

describe("run controller — sim ↔ diagnostics integration", () => {
  beforeEach(() => {
    run.start("test-seed", LOADOUT);
  });

  it("starts a run on the boot Sol with zero distance", () => {
    const s = run.snapshot();
    expect(s?.sol).toBe(1);
    expect(s?.distance).toBe(0);
    expect(s?.outcome).toBe("running");
    expect(s?.crew.length).toBeGreaterThan(0);
  });

  it("does not advance while parked (not driving)", () => {
    tickFrames(SECONDS_PER_SOL * 3);
    expect(run.snapshot()?.sol).toBe(1);
  });

  it("advances Sols + distance while driving", () => {
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 4);
    const s = run.snapshot();
    expect(s?.sol).toBeGreaterThan(1);
    expect(s?.distance).toBeGreaterThan(0);
  });

  it("publishes live state into the diagnostics bridge", () => {
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL);
    const d = getDiagnostics();
    expect(d.sol).toBeGreaterThanOrEqual(1);
    expect(d.driving).toBe(true);
    expect(d.hull).toBeLessThanOrEqual(1);
  });

  it("is deterministic — same seed + inputs → same distance", () => {
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 10);
    const a = run.snapshot()?.distance;

    run.start("test-seed", LOADOUT);
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 10);
    const b = run.snapshot()?.distance;

    expect(a).toBe(b);
  });
});
