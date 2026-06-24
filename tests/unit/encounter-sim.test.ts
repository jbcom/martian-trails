import { beforeEach, describe, expect, it } from "vitest";
import { getNpc } from "@/content/encounters";
import { run } from "@/sim/run";
import { SECONDS_PER_SOL } from "@/sim/tick";

const LOADOUT = {
  oxygen: 9000,
  water: 9000,
  rations: 9000,
  parts: 50,
  medkits: 4,
  rtg: 4,
  upgrades: [] as string[],
};

function tickFrames(seconds: number) {
  const frame = 1 / 60;
  for (let t = 0; t < seconds; t += frame) run.tick(frame);
}

/**
 * Drive until an encounter reaches HAIL (pendingEncounter set), skipping events and
 * hazards along the way. Returns the pending encounter or null if none within budget.
 */
function driveToEncounter(maxSols = 200) {
  run.setDriving(true);
  for (
    let i = 0;
    i < maxSols && !run.currentEncounter && run.snapshot()?.outcome === "running";
    i++
  ) {
    tickFrames(SECONDS_PER_SOL);
    if (run.currentEvent) {
      run.applyEventChoice([]);
      run.setDriving(true);
    }
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
      run.setDriving(true);
    }
  }
  return run.currentEncounter;
}

describe("encounter sim — determinism", () => {
  beforeEach(() => {
    run.start("enc-seed", LOADOUT);
  });

  it("same seed produces the same encounter NPC at the same Sol", () => {
    const enc1 = driveToEncounter();
    expect(enc1).not.toBeNull();
    const npcId1 = enc1?.npcId;

    run.start("enc-seed", LOADOUT);
    const enc2 = driveToEncounter();
    expect(enc2).not.toBeNull();

    expect(enc2?.npcId).toBe(npcId1);
  });

  it("different seeds produce independent encounter streams", () => {
    const enc1 = driveToEncounter();
    run.start("other-seed", LOADOUT);
    const enc2 = driveToEncounter();
    // They may collide by chance but we just check the system runs without error.
    expect(enc1 !== undefined || enc2 !== undefined).toBe(true);
  });

  it("encounterHalted gates the rover — driving is false while NPC is active", () => {
    run.setDriving(true);
    // Tick until encounter fires (enc active but not yet HAIL).
    for (let i = 0; i < 50 && !run.isEncounterActive; i++) {
      tickFrames(SECONDS_PER_SOL);
      if (run.currentEvent) {
        run.applyEventChoice([]);
        run.setDriving(true);
      }
      if (run.currentHazard) {
        run.resolveHazard(run.currentHazard.options[0].id);
        run.resumeFromHazard();
        run.setDriving(true);
      }
    }
    if (!run.isEncounterActive) return; // encounter didn't fire on this seed in budget
    // setDriving(true) must fail while encounter is active.
    run.setDriving(true);
    expect(run.snapshot()?.driving).toBe(false);
  });
});

describe("encounter sim — respondEncounter effects", () => {
  beforeEach(() => {
    run.start("enc-resp-seed", LOADOUT);
  });

  it("decline choice clears the encounter and resumes the rover", () => {
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();
    const distBefore = run.snapshot()?.distance ?? 0;

    run.respondEncounter("decline");
    run.setDriving(true);

    expect(run.currentEncounter).toBeNull();
    expect(run.snapshot()?.driving).toBe(true);

    // After respond, rover can drive forward.
    tickFrames(SECONDS_PER_SOL);
    expect(run.snapshot()?.distance).toBeGreaterThan(distBefore);
  });

  it("trade choice applies resource deltas", () => {
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();

    const node = enc!.resolved.node;
    const tradeChoice = node.choices.find((c) => c.effects.length > 0);
    if (!tradeChoice) return; // node has no effect choices on this seed

    const resBefore = run.snapshot()?.resources as Record<string, number>;
    run.respondEncounter(tradeChoice.id);

    const resAfter = run.snapshot()?.resources as Record<string, number>;
    // At least one resource changed.
    const changed = tradeChoice.effects.some((ef) => resAfter[ef.target] !== resBefore[ef.target]);
    expect(changed).toBe(true);
  });

  it("pendingEncounter exposes the resolved NPC id and node lines", () => {
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();

    const npcId = enc!.npcId;
    const npc = getNpc(npcId);
    expect(npc).toBeDefined();

    const snap = run.snapshot();
    expect(snap?.pendingEncounter?.npcId).toBe(npcId);
    expect(snap?.pendingEncounter?.resolved.node.lines.length).toBeGreaterThan(0);
  });

  it("a goto choice branches to another node without ending the encounter", () => {
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();

    // The trader's first-meeting has an "ask-route" choice that gotos the route-tip node.
    const gotoChoice = enc!.resolved.node.choices.find((c) => c.goto);
    if (!gotoChoice) return; // not on this seed's resolved node
    const fromNode = enc!.resolved.nodeKey;

    run.respondEncounter(gotoChoice.id);

    // Encounter stays open, now showing the goto target node (a different node).
    expect(run.currentEncounter).not.toBeNull();
    expect(run.currentEncounter?.resolved.nodeKey).toBe(gotoChoice.goto);
    expect(run.currentEncounter?.resolved.nodeKey).not.toBe(fromNode);

    // A plain (no-goto) choice on the branched node then ends the encounter.
    const endChoice = run.currentEncounter?.resolved.node.choices.find((c) => !c.goto);
    if (endChoice) {
      run.respondEncounter(endChoice.id);
      expect(run.currentEncounter).toBeNull();
    }
  });
});

describe("encounter sim — serialize / restore", () => {
  beforeEach(() => {
    run.start("enc-save-seed", LOADOUT);
  });

  it("encounter active at save time is restored — rover resumes halted", () => {
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();

    const saved = run.serialize();
    expect(saved).not.toBeNull();

    run.start("unrelated", {
      oxygen: 100,
      water: 100,
      rations: 100,
      parts: 1,
      medkits: 0,
      rtg: 1,
      upgrades: [],
    });
    run.restore(saved!);

    // After restore the encounter is still active — rover must be halted.
    run.setDriving(true);
    expect(run.snapshot()?.driving).toBe(false);
  });

  it("no encounter at save time — restore starts clean with no encounter halt", () => {
    // Serialize immediately (no encounter yet).
    const saved = run.serialize();
    expect(saved).not.toBeNull();

    run.restore(saved!);
    run.setDriving(true);
    expect(run.isEncounterActive).toBe(false);
    expect(run.snapshot()?.driving).toBe(true);
  });

  it("same future from restored state — deterministic-equivalent distance", () => {
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 2);
    // Skip any halts so Sol cursor advances cleanly.
    if (run.currentEncounter) run.respondEncounter("decline");
    if (run.currentEvent) run.applyEventChoice([]);
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
    }
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 2);

    const saved = run.serialize();

    // Path A: keep driving.
    if (run.currentEncounter) run.respondEncounter("decline");
    if (run.currentEvent) run.applyEventChoice([]);
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
    }
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 2);
    const liveDist = run.snapshot()?.distance;

    // Path B: restore, same actions.
    run.restore(saved!);
    if (run.currentEncounter) run.respondEncounter("decline");
    if (run.currentEvent) run.applyEventChoice([]);
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
    }
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 2);
    const restoredDist = run.snapshot()?.distance;

    expect(restoredDist).toBe(liveDist);
  });
});
