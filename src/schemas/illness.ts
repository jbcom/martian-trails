/**
 * Zod schema for illness.json — the typed condition table that un-stubs the POC's flat
 * 'Injury'/'Hypothermia'/'Radiation Sickness'/'Regolith Lung' strings (GAME-DESIGN.md M7).
 *
 * Each condition has a named cause, a progression rate (how fast its severity climbs per
 * Sol), and a mortality rate (the per-Sol death-roll probability once afflicted). The POC
 * used one generic 0.15/Sol death roll for any condition; this makes mortality per-typed.
 */
import { z } from "zod";

export const conditionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Human-readable onset cause (flavor + future event wiring). */
  cause: z.string().min(1),
  /** Severity gained per Sol while untreated (0..1, severity 1 = critical). */
  progressionPerSol: z.number().min(0).max(1),
  /** Per-Sol death-roll probability while afflicted (POC generic 0.15). */
  mortalityPerSol: z.number().min(0).max(1),
  /** Morale lost by the crew each Sol this member stays afflicted (POC -5). */
  moralePenaltyPerSol: z.number().min(0),
  /** Morale lost by the crew when this member dies of the condition (POC -20). */
  moralePenaltyOnDeath: z.number().min(0),
});
export type ConditionConfig = z.infer<typeof conditionSchema>;

export const illnessSchema = z.object({
  conditions: z.array(conditionSchema).min(1),
  /** Severity at/above which the death roll applies its full mortality (else scaled). */
  criticalSeverity: z.number().min(0).max(1),
  /** Morale at/below which a low-morale crew-death roll fires (POC <=10). */
  lowMoraleThreshold: z.number().min(0),
  /** Probability one crew member dies on a low-morale Sol (POC 0.1). */
  lowMoraleDeathChance: z.number().min(0).max(1),
  /** Morale restored per healthy state when a medkit treats the crew (POC +10). */
  healMoraleBonus: z.number().min(0),
});
export type IllnessConfig = z.infer<typeof illnessSchema>;
