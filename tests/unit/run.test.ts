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

  it("setPace / setRations write the Travel trait through the snapshot", () => {
    run.setPace("grueling");
    run.setRations("bareBones");
    const s = run.snapshot();
    expect(s?.pace).toBe("grueling");
    expect(s?.rationLevel).toBe("bareBones");
  });

  it("ignores unknown pace / ration keys", () => {
    run.setPace("warp-speed");
    run.setRations("feast");
    const s = run.snapshot();
    expect(s?.pace).toBe("steady");
    expect(s?.rationLevel).toBe("filling");
  });

  it("raises a trail event during travel and halts driving", () => {
    // Generous supplies so the crew survives long enough to (deterministically) hit
    // an event; grueling maximizes the per-Sol event chance.
    run.start("test-seed", { ...LOADOUT, oxygen: 9000, water: 9000, rations: 9000 });
    run.setPace("grueling");
    run.setDriving(true);
    let event = null;
    for (let i = 0; i < 30 && !event && run.snapshot()?.outcome === "running"; i++) {
      tickFrames(SECONDS_PER_SOL);
      event = run.currentEvent;
    }
    expect(event).not.toBeNull();
    // A pending event halts the rover and is exposed via the snapshot.
    expect(run.snapshot()?.driving).toBe(false);
    expect(run.snapshot()?.pendingEvent?.id).toBe(event?.id);
  });

  it("applyEventChoice applies effects and clears the pending event", () => {
    run.start("test-seed", { ...LOADOUT, oxygen: 9000, water: 9000, rations: 9000 });
    run.setPace("grueling");
    run.setDriving(true);
    for (let i = 0; i < 30 && !run.currentEvent && run.snapshot()?.outcome === "running"; i++) {
      tickFrames(SECONDS_PER_SOL);
    }
    const event = run.currentEvent;
    expect(event).not.toBeNull();

    const before = run.snapshot()?.resources as { morale: number };
    // Apply a known delta and confirm it lands clamped into Resources.
    run.applyEventChoice([{ target: "morale", delta: -5 }]);
    const after = run.snapshot()?.resources as { morale: number };
    expect(run.currentEvent).toBeNull();
    expect(after.morale).toBe(Math.max(0, before.morale - 5));
  });
});
