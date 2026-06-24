import { Preferences } from "@capacitor/preferences";
import { z } from "zod";

/**
 * Persistence bridge over @capacitor/preferences (key-value; works on web via
 * localStorage and on-device natively). Values are zod-validated on read so a
 * corrupt/old save degrades to a default instead of crashing.
 */
export async function save<T>(key: string, value: T): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
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
});
export const highScoresSchema = z.array(highScoreSchema);
