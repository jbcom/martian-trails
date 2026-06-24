import { z } from "zod";

/**
 * Crew active-ability schema (GAME-DESIGN.md §2 M10 — "roles grant active abilities").
 * The crew already carry passive traits (crew.json); this is the ACTIVE, player-triggered
 * ability each role contributes from the travel screen: Rally Crew, Jury-Rig, Deep Prospect,
 * Emergency Harvest. Each costs resources/Sols and has a cooldown. The pure resolver
 * (src/sim/abilities.ts) interprets this — "code interprets content, never embeds it".
 *
 * Effects reuse the event/hazard signed-delta vocabulary; a few abilities also set a
 * one-shot run flag (e.g. the geologist primes the next EVA's yield) expressed as `sets`.
 */
export const abilityEffectSchema = z.object({
  target: z.enum(["oxygen", "water", "rations", "power", "morale", "hull", "parts", "medkits"]),
  delta: z.number(),
});
export type AbilityEffect = z.infer<typeof abilityEffectSchema>;

/** One crew member's active ability. `crewId` binds it to a crew.roster member. */
export const abilitySchema = z.object({
  /** Stable id (e.g. "rally-crew"). */
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** The crew.roster id whose role grants this ability. */
  crewId: z.string().min(1),
  /** Display name shown on the crew panel button. */
  name: z.string().min(1).max(28),
  /** One-line description of what it does + its cost. */
  desc: z.string().min(1).max(120),
  /** Sols the action consumes (0 = instant). */
  sols: z.number().int().min(0).max(10).default(0),
  /** Cooldown in Sols before the ability can be used again. */
  cooldownSols: z.number().int().min(0).max(60),
  /** Resource deltas applied on use (positive heals, negative pays the cost). */
  effects: z.array(abilityEffectSchema).default([]),
  /**
   * A one-shot run buff this ability arms, drained when next consumed. Only the geologist's
   * "Deep Prospect" uses it — it sets `evaYieldBonus` so the NEXT EVA hauls more.
   */
  sets: z.enum(["evaYieldBonus"]).optional(),
});
export type Ability = z.infer<typeof abilitySchema>;

export const abilitiesFileSchema = z.object({
  abilities: z.array(abilitySchema).min(1),
  /** The yield multiplier the geologist's primed EVA enjoys (1 = no buff). */
  evaYieldBonusMult: z.number().min(1).max(3).default(1.5),
});
export type AbilitiesConfig = z.infer<typeof abilitiesFileSchema>;
