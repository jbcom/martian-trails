import { Preferences } from "@capacitor/preferences";
import { z } from "zod";

/**
 * Persistence bridge over @capacitor/preferences (key-value; works on web via
 * localStorage and on-device natively). Values are zod-validated on read so a
 * corrupt/old save degrades to a default instead of crashing.
 */

/**
 * Write a value. Returns `true` on success, `false` if the store rejected the write
 * (e.g. a `QuotaExceededError` when storage is full, or a native bridge error). Never
 * throws — callers `void`-fire this from effects, so a thrown rejection would be an
 * unhandled-rejection that silently loses the save. Returning a boolean lets callers
 * detect and surface failure instead.
 */
export async function save<T>(key: string, value: T): Promise<boolean> {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) });
    return true;
  } catch (err) {
    // Storage full or unavailable — the caller decides how loud to be. Log so the failure
    // isn't invisible in the field (a swallowed save is the exact data-loss this feature fights).
    console.warn(`[persistence] failed to save "${key}":`, err);
    return false;
  }
}

export async function load<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  if (value == null) return fallback;
  try {
    return schema.parse(JSON.parse(value));
  } catch {
    return fallback;
  }
}

export async function remove(key: string): Promise<void> {
  await Preferences.remove({ key });
}

/** Persisted settings shape (mirrors the store's Settings). */
export const settingsSchema = z.object({
  muted: z.boolean(),
  reducedMotion: z.boolean(),
  haptics: z.boolean(),
});

/** Persisted high-score entry. */
export const highScoreSchema = z.object({
  score: z.number(),
  sol: z.number(),
  survivors: z.number(),
  seed: z.string(),
  /** The mission sponsor id the run was flown under (UNOMA / consortium / …). */
  sponsorId: z.string().default("unoma"),
  /** Epoch-ms the run was banked, for the board's date column. */
  date: z.number().default(0),
});
export const highScoresSchema = z.array(highScoreSchema);

export type HighScore = z.infer<typeof highScoreSchema>;

/** Max entries the Hall of Records keeps (top N by score, descending). */
export const HIGH_SCORE_CAP = 10;

/**
 * Pure high-score table insert: append the entry, sort by score descending, and cap to
 * the top N. Kept pure (no I/O) so it round-trips in a unit test; the run controller
 * persists the result via `persistence.save`.
 */
export function insertHighScore(
  table: readonly HighScore[],
  entry: HighScore,
  cap = HIGH_SCORE_CAP,
): HighScore[] {
  return [...table, entry].sort((a, b) => b.score - a.score).slice(0, cap);
}
