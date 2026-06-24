import { beforeEach, describe, expect, it } from "vitest";
import {
  HIGH_SCORE_CAP,
  type HighScore,
  highScoresSchema,
  insertHighScore,
  load,
  save,
} from "@/platform/persistence";
import { runSaveSchema } from "@/schemas/save";
import { defaultLoadout } from "@/sim/factories";
import { run } from "@/sim/run";
import { SECONDS_PER_SOL } from "@/sim/tick";

const LOADOUT = {
  oxygen: 900,
  water: 900,
  rations: 900,
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

describe("run save — serialize / restore round-trip", () => {
  beforeEach(() => {
    run.start("save-seed", LOADOUT);
  });

  it("serializes a started run into a schema-valid RunSave", () => {
    const save = run.serialize();
    expect(save).not.toBeNull();
    // The save validates against its own schema (so persistence.load will accept it).
    expect(() => runSaveSchema.parse(save)).not.toThrow();
    expect(save?.seed).toBe("save-seed");
    expect(save?.version).toBe(1);
  });

  it("restore yields a snapshot equal to the serialized run (drive a few Sols first)", () => {
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 6);
    const before = run.snapshot();
    const saved = run.serialize();
    expect(saved).not.toBeNull();

    // Tear down and rebuild purely from the save.
    run.start("unrelated-seed", defaultLoadout());
    run.restore(saved!);
    const after = run.snapshot();

    // Core resumable state is identical.
    expect(after?.sol).toBe(before?.sol);
    expect(after?.distance).toBe(before?.distance);
    expect(after?.score).toBe(before?.score);
    expect(after?.pace).toBe(before?.pace);
    expect(after?.rationLevel).toBe(before?.rationLevel);
    expect(after?.outcome).toBe(before?.outcome);
    expect(after?.resources).toEqual(before?.resources);
    expect(after?.crew.map((c) => c.id)).toEqual(before?.crew.map((c) => c.id));
    expect(after?.crew.map((c) => c.alive)).toEqual(before?.crew.map((c) => c.alive));
  });

  it("restore is deterministic-equivalent — same future from the restored state", () => {
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 4);
    const saved = run.serialize();

    // Path A: keep driving the live run.
    tickFrames(SECONDS_PER_SOL * 4);
    const liveDistance = run.snapshot()?.distance;

    // Path B: restore the mid-run save, drive the same span.
    run.restore(saved!);
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 4);
    const restoredDistance = run.snapshot()?.distance;

    expect(restoredDistance).toBe(liveDistance);
  });

  it("restore drops any pending decision — the rover resumes parked", () => {
    run.restore(run.serialize()!);
    const s = run.snapshot();
    expect(s?.pendingEvent).toBeNull();
    expect(s?.pendingHazard).toBeNull();
    expect(s?.pendingOutpost).toBeNull();
    expect(s?.driving).toBe(false);
  });

  it("persists the primed Deep Prospect buff across save/restore (banked, not pending)", () => {
    // Frank's "Deep Prospect" primes the next EVA for a 1.5× haul at the cost of a 5-Sol cooldown.
    // The buff is banked state (paid for) — a refresh between priming and the EVA must NOT drop it.
    const primed = run.useAbility("frank");
    expect(primed).toBe(true);
    const save = run.serialize();
    expect(save?.progress.evaYieldPrimed).toBe(true);

    // Restore into a fresh world and confirm the flag survived the round-trip.
    run.restore(save!);
    expect(run.serialize()?.progress.evaYieldPrimed).toBe(true);
  });

  it("back-fills evaYieldPrimed=false for a pre-existing save missing the field", () => {
    const save = run.serialize()!;
    // Simulate an older save written before the field existed.
    const legacy = JSON.parse(JSON.stringify(save));
    delete legacy.progress.evaYieldPrimed;
    const parsed = runSaveSchema.parse(legacy);
    expect(parsed.progress.evaYieldPrimed).toBe(false);
  });
});

describe("high-score table — insert / sort / cap", () => {
  const entry = (score: number): HighScore => ({
    score,
    sol: 40,
    survivors: 4,
    seed: `s-${score}`,
    sponsorId: "unoma",
    date: score,
  });

  it("inserts and keeps the table sorted high → low", () => {
    let table: HighScore[] = [];
    table = insertHighScore(table, entry(1000));
    table = insertHighScore(table, entry(3000));
    table = insertHighScore(table, entry(2000));
    expect(table.map((t) => t.score)).toEqual([3000, 2000, 1000]);
  });

  it("caps the board at the top N entries", () => {
    let table: HighScore[] = [];
    for (let i = 0; i < HIGH_SCORE_CAP + 5; i++) table = insertHighScore(table, entry(i * 100));
    expect(table.length).toBe(HIGH_SCORE_CAP);
    // Only the highest scores survive the cap.
    expect(table[0].score).toBe((HIGH_SCORE_CAP + 4) * 100);
    expect(table.at(-1)?.score).toBe(5 * 100);
  });

  it("a sub-par score is dropped once the board is full", () => {
    let table: HighScore[] = [];
    for (let i = 0; i < HIGH_SCORE_CAP; i++) table = insertHighScore(table, entry(1000 + i));
    const before = table.length;
    table = insertHighScore(table, entry(1)); // below every existing entry
    expect(table.length).toBe(before);
    expect(table.find((t) => t.score === 1)).toBeUndefined();
  });
});

describe("persistence — corrupt / stale save degradation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("a valid round-trip survives JSON + zod", async () => {
    run.start("persist-seed", LOADOUT);
    const saved = run.serialize()!;
    await save("run", saved);
    const back = await load("run", runSaveSchema, null);
    expect(back?.seed).toBe("persist-seed");
  });

  it("a corrupt run save degrades to the fallback, not a throw", async () => {
    await save("run", { version: 1, seed: 12345 }); // wrong types → zod rejects
    const back = await load("run", runSaveSchema, null);
    expect(back).toBeNull();
  });

  it("non-JSON storage degrades to the fallback", async () => {
    localStorage.setItem("CapacitorStorage.run", "{not valid json");
    const back = await load("run", runSaveSchema, null);
    expect(back).toBeNull();
  });

  it("an old high-score entry missing sponsorId / date back-fills via defaults", async () => {
    // Pre-m7 entries lacked sponsorId + date; the schema defaults keep them readable.
    localStorage.setItem(
      "CapacitorStorage.highscores",
      JSON.stringify([{ score: 2200, sol: 35, survivors: 3, seed: "old" }]),
    );
    const board = await load("highscores", highScoresSchema, []);
    expect(board).toHaveLength(1);
    expect(board[0].sponsorId).toBe("unoma");
    expect(board[0].date).toBe(0);
  });
});
