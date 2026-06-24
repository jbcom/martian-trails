import {
  type HighScore,
  highScoresSchema,
  insertHighScore,
  load,
  remove,
  save,
} from "@/platform/persistence";
import { type RunSave, runSaveSchema } from "@/schemas/save";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";

/**
 * Save-game orchestration (m7 hardening) — the bridge between the pure-ish run controller
 * (koota world + traits) and the @capacitor/preferences key-value store (localStorage on
 * web, native on device). The run controller stays free of platform I/O; this module owns
 * the read/write/clear lifecycle and the high-score banking.
 */

/** Preferences keys. */
const RUN_KEY = "run";
const HIGH_SCORES_KEY = "highscores";

/**
 * Persist the live run if there is one to save and it's still in progress. A no-op when no
 * run is active or the run has already ended (terminus/gameover clear the save separately).
 * Called on each Sol advance, on screen changes into/out of travel, and on visibilitychange /
 * pagehide so a refresh mid-run never loses the expedition.
 */
export async function saveRun(): Promise<boolean> {
  const snapshot = run.serialize();
  if (snapshot?.outcome.status !== "running") return false;
  return save(RUN_KEY, snapshot);
}

/** Load the saved run (zod-validated; corrupt/stale → null). */
export async function loadRun(): Promise<RunSave | null> {
  return load<RunSave | null>(RUN_KEY, runSaveSchema.nullable(), null);
}

/** Drop the saved run (on terminus, gameover, or a fresh expedition). */
export async function clearRun(): Promise<void> {
  await remove(RUN_KEY);
}

/**
 * Read the Hall of Records, sorted high → low (corrupt/stale → empty board), and mirror it into
 * the store so the boot + terminus screens render it reactively.
 */
export async function loadHighScores(): Promise<HighScore[]> {
  const table = await load<HighScore[]>(HIGH_SCORES_KEY, highScoresSchema, []);
  const sorted = [...table].sort((a, b) => b.score - a.score);
  useGameStore.getState().setHighScores(sorted);
  return sorted;
}

/**
 * Bank a finished (won) run onto the Hall of Records: insert, re-sort, cap to the top N, persist,
 * and push into the store (so terminus + boot update reactively without an effect-ordering race).
 * Returns the updated board. Idempotent only at the call site — call once on terminus.
 */
export async function recordHighScore(entry: HighScore): Promise<HighScore[]> {
  const table = await load<HighScore[]>(HIGH_SCORES_KEY, highScoresSchema, []);
  const next = insertHighScore(table, entry);
  // Push into the store first so the board renders the new entry even if the persistent write
  // fails (quota) — the player at least sees their rating this session. The persisted copy is
  // best-effort; save() logs on failure rather than throwing into a void-fired effect.
  useGameStore.getState().setHighScores(next);
  await save(HIGH_SCORES_KEY, next);
  return next;
}
