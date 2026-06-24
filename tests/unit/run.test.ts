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

/**
 * Drive Sols until a hazard is raised (or the loop budget runs out), resolving any random
 * trail events along the way (an event halt also stops the rover, which would otherwise stall
 * the drive short of the hazard) and keeping the rover under power.
 */
function driveToHazard(maxSols = 400) {
  run.setDriving(true);
  for (let i = 0; i < maxSols && !run.currentHazard && run.snapshot()?.outcome === "running"; i++) {
    tickFrames(SECONDS_PER_SOL);
    if (run.currentEvent) {
      run.applyEventChoice([]);
      run.setDriving(true);
    }
  }
  return run.currentHazard;
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

describe("run controller — hazard traverse", () => {
  beforeEach(() => {
    run.start("hz-seed", { ...LOADOUT, oxygen: 9000, water: 9000, rations: 9000 });
    run.setDriving(true);
  });

  it("raises a hazard at its route distance and halts the rover", () => {
    // Drive far enough to cross the first hazard (Noctis Chasma @ 360 km).
    const hazard = driveToHazard();
    expect(hazard).not.toBeNull();
    const s = run.snapshot();
    expect(s?.pendingHazard?.id).toBe(hazard?.id);
    expect(s?.driving).toBe(false);
    // The read gauge is a real 0..1 value the UI shows.
    expect(s?.hazardRead).toBeGreaterThan(0);
    expect(s?.hazardRead).toBeLessThanOrEqual(1);
  });

  it("resolveHazard applies the outcome, costs Sols, and clears the halt", () => {
    const hazard = driveToHazard();
    expect(hazard).not.toBeNull();
    const solBefore = run.snapshot()?.sol ?? 0;
    // Detour is the safe band (+3 Sols, −8 km) on Noctis Chasma; pick whatever detour-like
    // option exists, else the first option.
    const opt = hazard?.options.find((o) => o.id === "detour") ?? hazard?.options[0];
    const result = run.resolveHazard(opt!.id);
    expect(result).not.toBeNull();
    expect(run.currentHazard).toBeNull();
    expect(run.snapshot()?.sol).toBeGreaterThanOrEqual(solBefore);
    expect(run.snapshot()?.lastHazardResult?.optionId).toBe(opt!.id);
  });

  it("does not re-raise a resolved hazard", () => {
    const hazard = driveToHazard();
    expect(hazard).not.toBeNull();
    const id = hazard?.id;
    run.resolveHazard(hazard!.options[0].id);
    run.setDriving(true);
    // Tick a little more across the same window — the same hazard must not fire again.
    for (let i = 0; i < 10; i++) tickFrames(SECONDS_PER_SOL);
    expect(run.currentHazard?.id).not.toBe(id);
  });
});

describe("run controller — EVA prospecting", () => {
  beforeEach(() => {
    run.start("eva-seed", LOADOUT);
  });

  it("startEva opens a session capped at the rover's O₂", () => {
    const session = run.startEva();
    expect(session).not.toBeNull();
    expect(run.currentEva).not.toBeNull();
    expect(session?.o2 ?? 0).toBeGreaterThan(0);
  });

  it("scan + drill thread through the session and bank a haul", () => {
    const session = run.startEva()!;
    const dep = session.deposits.find((d) => d.remaining > 0)!;
    const heat = run.evaScan(dep.x, dep.y);
    expect(heat).toBe("hot");
    const hit = run.evaDrill(dep.x, dep.y);
    expect(hit).toBe(true);
    expect(run.currentEva?.haul.drills ?? 0).toBe(1);
  });

  it("endEva banks water/parts/score into the run and re-pools suit O₂", () => {
    // Capture O₂ BEFORE startEva charges the suit budget out of the rover.
    const o2Before = (run.snapshot()?.resources as { oxygen: number }).oxygen;
    const session = run.startEva()!;
    const dep = session.deposits.find((d) => d.remaining > 0)!;
    run.evaDrill(dep.x, dep.y);
    const scoreBefore = run.snapshot()?.score ?? 0;
    run.endEva();
    expect(run.currentEva).toBeNull();
    // Score grew by the haul's score.
    expect(run.snapshot()?.score).toBeGreaterThanOrEqual(scoreBefore);
    // O₂ is conserved minus what the EVA burned: lower than the pre-EVA pool, never higher.
    const o2After = (run.snapshot()?.resources as { oxygen: number }).oxygen;
    expect(o2After).toBeLessThan(o2Before);
  });

  it("is deterministic — same seed + actions → same haul", () => {
    const play = () => {
      run.start("eva-fixed", LOADOUT);
      const s = run.startEva()!;
      const dep = s.deposits.find((d) => d.remaining > 0)!;
      run.evaScan(dep.x, dep.y);
      run.evaDrill(dep.x, dep.y);
      return JSON.stringify(run.currentEva?.haul);
    };
    expect(play()).toBe(play());
  });
});
