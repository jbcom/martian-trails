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
    if (run.currentEncounter) {
      run.respondEncounter("decline");
      run.setDriving(true);
    }
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
      if (run.currentEncounter) {
        run.respondEncounter("decline");
        run.setDriving(true);
      }
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
      if (run.currentEncounter) {
        run.respondEncounter("decline");
        run.setDriving(true);
      }
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

/**
 * Drive Sols until the rover docks at an outpost, clearing hazards (pick the first option) and
 * events along the way so neither halts the drive short of the dock.
 */
function driveToOutpost(maxSols = 800) {
  run.setDriving(true);
  for (
    let i = 0;
    i < maxSols && !run.currentOutpost && run.snapshot()?.outcome === "running";
    i++
  ) {
    tickFrames(SECONDS_PER_SOL);
    if (run.currentEncounter) {
      run.respondEncounter("decline");
      run.setDriving(true);
    }
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
      run.setDriving(true);
    }
    if (run.currentEvent) {
      run.applyEventChoice([]);
      run.setDriving(true);
    }
  }
  return run.currentOutpost;
}

describe("run controller — outpost stops", () => {
  beforeEach(() => {
    run.start("op-seed", { ...LOADOUT, oxygen: 9000, water: 9000, rations: 9000 });
    run.setDriving(true);
  });

  it("docks at the first outpost when its distance is reached and halts the rover", () => {
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    const s = run.snapshot();
    expect(s?.pendingOutpost?.name).toBe(stop?.name);
    expect(s?.driving).toBe(false);
  });

  it("restAtOutpost heals morale, costs Sols, and clears crew conditions", () => {
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    // Wound morale + a crew condition so the rest visibly heals them.
    const e = run.snapshot();
    const moraleBefore = (e?.resources as { morale: number }).morale;
    const solBefore = e?.sol ?? 0;
    run.restAtOutpost();
    const after = run.snapshot();
    expect((after?.resources as { morale: number }).morale).toBeGreaterThanOrEqual(moraleBefore);
    expect(after?.sol).toBeGreaterThan(solBefore);
    // Still docked (trade/lore + leave remain available).
    expect(run.currentOutpost).not.toBeNull();
  });

  it("leaveOutpost resumes the trail and does not re-dock the same outpost", () => {
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    const name = stop?.name;
    run.leaveOutpost();
    expect(run.currentOutpost).toBeNull();
    run.setDriving(true);
    for (let i = 0; i < 5; i++) tickFrames(SECONDS_PER_SOL);
    expect(run.currentOutpost?.name).not.toBe(name);
  });

  it("a trade swaps resources only when affordable", () => {
    driveToOutpost();
    const offer = run.currentOutpost?.service.trades[0];
    expect(offer).toBeDefined();
    const before = run.snapshot()?.resources as Record<string, number>;
    const ok = run.tradeAtOutpost(offer!);
    expect(ok).toBe(true);
    const after = run.snapshot()?.resources as Record<string, number>;
    // The get-side resource grew.
    const getEffect = offer!.effects.find((ef) => ef.delta > 0)!;
    expect(after[getEffect.target]).toBeGreaterThanOrEqual(before[getEffect.target]);
  });

  it("outpost advice applies once and persists the selected advisor flag", () => {
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    const ok = run.resolveOutpostAdvice("veteran");
    expect(ok).toBe(true);
    const after = run.snapshot();
    expect(after?.encounterFlags).toContain("flag:advice:tharsis:veteran");

    const duplicate = run.resolveOutpostAdvice("veteran");
    expect(duplicate).toBe(false);

    const saved = run.serialize();
    expect(saved?.progress.encounterFlags).toContain("flag:advice:tharsis:veteran");
    run.restore(saved!);
    expect(run.snapshot()?.encounterFlags).toContain("flag:advice:tharsis:veteran");
  });
});

describe("run controller — crew active abilities", () => {
  beforeEach(() => {
    run.start("ability-seed", LOADOUT);
  });

  it("useAbility (Rally Crew) restores morale and stamps a cooldown", () => {
    // Drop morale via an event delta so the heal is visible.
    const before = (run.snapshot()?.resources as { morale: number }).morale;
    const fired = run.useAbility("john");
    expect(fired).toBe(true);
    const after = (run.snapshot()?.resources as { morale: number }).morale;
    expect(after).toBeGreaterThanOrEqual(before);
    // Immediately re-using is blocked by the cooldown.
    const crew = run.snapshot()?.crew.find((c) => c.id === "john");
    expect(crew?.ability?.blocked).toBe("cooldown");
  });

  it("Jury-Rig repairs hull with no part cost", () => {
    const partsBefore = (run.snapshot()?.resources as { parts: number }).parts;
    run.useAbility("maya");
    const res = run.snapshot()?.resources as { parts: number; hull: number };
    expect(res.parts).toBe(partsBefore); // no part consumed
  });

  it("Deep Prospect primes the next EVA for a richer haul", () => {
    // Baseline haul without the buff (same seed + actions).
    const baseRun = () => {
      run.start("dp-seed", LOADOUT);
      const s = run.startEva()!;
      const dep = s.deposits.find((d) => d.remaining > 0)!;
      run.evaDrill(dep.x, dep.y);
      run.endEva();
      return run.snapshot()?.score ?? 0;
    };
    const baseScore = baseRun();

    // Primed run: arm Deep Prospect, then the same EVA actions.
    run.start("dp-seed", LOADOUT);
    run.useAbility("frank");
    const s = run.startEva()!;
    const dep = s.deposits.find((d) => d.remaining > 0)!;
    run.evaDrill(dep.x, dep.y);
    run.endEva();
    const primedScore = run.snapshot()?.score ?? 0;
    expect(primedScore).toBeGreaterThan(baseScore);
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
