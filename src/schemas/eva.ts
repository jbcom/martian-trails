import { z } from "zod";

/**
 * EVA-prospecting content schema — the hunting equivalent (GAME-DESIGN.md §2 M6, §5). EVA is
 * DATA (src/config/eva.json): the O₂-as-ammo economy, the seeded deposit field, the per-type
 * yields, the carry cap, and the over-stay injury curve. The pure resolver (src/sim/eva.ts)
 * interprets it — "code interprets content, never embeds it".
 *
 * Deposit yields are keyed by type so the JSON author tunes ice→water / ore→parts /
 * samples→score without touching code. Yields are per-drill; the carry cap (kg-equivalent
 * mass) bounds a lucky strike exactly like the 100-lb meat cap in Oregon Trail's hunt.
 */

/** A prospecting deposit type and what a drill yields from it. */
export const depositTypeSchema = z.object({
  /** Stable id (e.g. "ice", "ore", "sample"). */
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Display name shown when a deposit is identified. */
  name: z.string().min(1).max(24),
  /** Which resource a drill banks (water/parts), or none for score-only samples. */
  resource: z.enum(["water", "parts", "none"]),
  /** Resource units yielded per successful drill. */
  yield: z.number().min(0),
  /** Score banked per drill (samples score; others may add a little too). */
  score: z.number().min(0).default(0),
  /** Carry-mass each drill of this type adds toward the cap. */
  mass: z.number().min(0),
  /** Relative spawn weight when seeding the deposit field. */
  weight: z.number().min(0),
  /** Drills it takes to exhaust one deposit of this type. */
  capacity: z.number().int().min(1),
});
export type DepositType = z.infer<typeof depositTypeSchema>;

export const evaSchema = z.object({
  /** O₂ the suit starts an EVA with (the "ammo" + clock). Capped by rover O₂ on entry. */
  o2Budget: z.number().min(1),
  /** O₂ a scan sweep costs. */
  scanCost: z.number().min(0),
  /** O₂ a drill action costs. */
  drillCost: z.number().min(0),
  /** O₂ that ambient suit drain bleeds per action regardless (passive clock). */
  ambientDrainPerAction: z.number().min(0).default(0),
  /** Carry-mass cap; once haul mass reaches this, drilling is locked (return to bank). */
  carryCap: z.number().min(1),
  /** Field grid dimension (gridSize × gridSize cells the scanner reads over). */
  gridSize: z.number().int().min(3).max(12),
  /** Number of deposits seeded into the field. */
  depositCount: z.number().int().min(1),
  /** Per-action injury probability once O₂ falls at/below `injuryO2Threshold`. */
  injuryChancePerAction: z.number().min(0).max(1),
  /** O₂ at/below which the over-stay injury roll begins firing. */
  injuryO2Threshold: z.number().min(0),
  /** Morale the crew gains when an EVA is banked with a worthwhile haul. */
  haulMoraleBonus: z.number().min(0).default(0),
  /** Deposit types the field is seeded from (≥1). */
  deposits: z.array(depositTypeSchema).min(1),
});
export type EvaConfig = z.infer<typeof evaSchema>;
