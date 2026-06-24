import loreData from "@/content/outposts/lore.json";
import { loreFileSchema, type OutpostLore } from "@/schemas/lore";

/**
 * Outpost lore registry — the "fort news" the player overhears when docking. Loads
 * + validates the GenAI-generated lines at module load; the M5 outpost screen
 * interprets them. Code interprets content; the lore is data.
 */
const lore: OutpostLore[] = loreFileSchema.parse(loreData);

const byOutpost = new Map(lore.map((l) => [l.outpost, l]));

/** Lore lines for a named outpost, or an empty list. */
export function loreFor(outpost: string): readonly string[] {
  return byOutpost.get(outpost)?.lines ?? [];
}

export function allLore(): readonly OutpostLore[] {
  return lore;
}
