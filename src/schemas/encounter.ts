import { z } from "zod";
import { effectSchema } from "@/schemas/event";

/**
 * Diegetic-encounter content schema (M8). An encounter is a fellow Martian you meet — a trader's
 * crawler that steers up to the rover, a stranded survivor, a checkpoint warden — presented as an
 * in-scene NPC + a portrait card, NOT a giant dialogue box (docs/ENCOUNTERS.md).
 *
 * The shape mirrors a-good-old-fashioned-adventure's content-driven dialogue BANKS (slots resolve
 * by state, top-down first-match), but specialises the `when` conditions for Mars run-state and
 * carries consequences INLINE on choices (we have no quest engine — `code interprets content`).
 */

/** NPC roles, each mapping a Trail archetype to a Mars verb (docs/ENCOUNTERS.md §5). */
export const npcArchetypeSchema = z.enum([
  "trader", // vendor — barter consumables (Matt's General Store)
  "stranded", // rescue-vs-ration dilemma (Oregon roadside party)
  "pilgrim", // info + flavor (wandering colonist)
  "scavenger", // opportunist — trade or threat
  "roadwarden", // gatekeeper — checkpoint levy (Yukon NWMP)
  "liaison", // corporate advisor (Amazon Westerner)
  "veteran", // colonist advisor (Amazon native guide)
]);

/**
 * A Martian NPC definition — the identity + how it looks (feeds the Imagen portrait prompt) +
 * the steering/goal tuning the encounterAI brain consumes.
 */
export const martianNpcSchema = z.object({
  id: z.string().regex(/^npc:[a-z0-9-]+$/),
  name: z.string().min(1).max(32),
  archetype: npcArchetypeSchema,
  /** Visual cue woven into buildPortraitPrompt (e.g. "sun-weathered, cracked visor, wary eyes"). */
  look: z.string().min(1).max(160),
  /** Cache key for the generated Imagen face (defaults to the bare id slug). */
  portrait: z.string().optional(),
  /** Which encounter bank drives this NPC's conversation. */
  bank: z.string().regex(/^encbank:[a-z0-9-]+$/),
  /** Approach speed (sim units/sec) the Vehicle steers at toward the rover dock. */
  approachSpeed: z.number().min(0.1).max(20).default(4),
  /** Range (sim units) at which the NPC notices the rover and begins its hail. */
  hailRange: z.number().min(1).max(200).default(40),
  /** Per-intent desirability weights the GoalEvaluator scores (trade/beg/warn/raid). */
  goalWeights: z.record(z.string(), z.number()).default({ trade: 1 }),
});

/**
 * Run-state conditions for a slot to resolve. Specialised for Mars (sol/resource-low/flags)
 * rather than agofa's quest/stage. All present conditions must hold (AND).
 */
export const encounterWhenSchema = z.object({
  /** A run flag that must be set. */
  flagSet: z.string().optional(),
  /** A run flag that must NOT be set. */
  notFlag: z.string().optional(),
  /** Only from this Sol onward. */
  minSol: z.number().int().min(0).optional(),
  /** Only when this resource pool is below its low-water threshold (e.g. "oxygen"). */
  resourceLow: z.enum(["oxygen", "water", "rations", "power", "morale", "hull"]).optional(),
});

/** A choice the player can take at a node — carries its consequence inline. */
export const encounterChoiceSchema = z.object({
  id: z.string().min(1).max(24),
  text: z.string().min(1).max(80),
  /** Resource deltas applied when chosen (reuses the trail-event effect vocabulary). */
  effects: z.array(effectSchema).default([]),
  /** A run flag set when chosen (drives later slot resolution). */
  setsFlag: z.string().optional(),
  /** Open the existing outpost resupply trade instead of a flat effect. */
  opensTrade: z.string().optional(),
  /** Jump to another node in the same bank (branching). */
  goto: z.string().optional(),
});

/** A node = the NPC's lines + the choices offered. */
export const encounterNodeSchema = z.object({
  lines: z.array(z.string().min(1).max(220)).min(1).max(6),
  /** ≤4 choices; a node with no choices is a single-beat "acknowledge" exchange. */
  choices: z.array(encounterChoiceSchema).max(4).default([]),
  /** Flag/telemetry hook emitted when the node is seen or a choice taken. */
  emits: z.string().min(1).max(48),
});

/** A slot binds a `when` condition to a node; `default:true` is the fallback (last). */
export const encounterSlotSchema = z.object({
  /** Addressable-only slots (resolved by name, skipped in state-driven resolution). */
  id: z.string().optional(),
  when: encounterWhenSchema.optional(),
  default: z.boolean().optional(),
  node: z.string().min(1),
});

/** An encounter bank = the full conversation for one NPC (slots + nodes). */
export const encounterBankSchema = z.object({
  id: z.string().regex(/^encbank:[a-z0-9-]+$/),
  /** The NPC speaking. */
  npc: z.string().regex(/^npc:[a-z0-9-]+$/),
  slots: z.array(encounterSlotSchema).min(1),
  nodes: z.record(z.string(), encounterNodeSchema),
});

export const martianNpcsFileSchema = z.array(martianNpcSchema);
export const encounterBanksFileSchema = z.array(encounterBankSchema);

export type NpcArchetype = z.infer<typeof npcArchetypeSchema>;
export type MartianNpc = z.infer<typeof martianNpcSchema>;
export type EncounterWhen = z.infer<typeof encounterWhenSchema>;
export type EncounterChoice = z.infer<typeof encounterChoiceSchema>;
export type EncounterNode = z.infer<typeof encounterNodeSchema>;
export type EncounterSlot = z.infer<typeof encounterSlotSchema>;
export type EncounterBank = z.infer<typeof encounterBankSchema>;
