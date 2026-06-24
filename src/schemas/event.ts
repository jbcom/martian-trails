import { z } from "zod";

/**
 * Trail-event content schema. Events are DATA (src/content/events/*.json),
 * interpreted by the M5 event system. The GenAI pipeline (scripts/genai-events.ts)
 * generates events against this schema; the validate gate refuses malformed output.
 *
 * Effects are a small declarative vocabulary the event engine applies — "code
 * interprets content, never embeds it".
 */
export const effectSchema = z.object({
  /** Which resource/stat this option touches. */
  target: z.enum(["oxygen", "water", "rations", "power", "morale", "hull", "parts", "medkits"]),
  /** Signed delta applied to the target (absolute units). */
  delta: z.number(),
});

export const optionSchema = z.object({
  label: z.string().min(1).max(48),
  effects: z.array(effectSchema).min(1),
  /** Optional flavor logged when chosen. */
  log: z.string().max(160).optional(),
});

export const eventSchema = z.object({
  id: z.string().regex(/^event:[a-z0-9-]+$/),
  title: z.string().min(1).max(48),
  description: z.string().min(1).max(280),
  /** Tags for selection/weighting by the event engine (e.g. weather, hazard). */
  tags: z.array(z.string()).default([]),
  /** ≥2 player choices, each with consequences. */
  options: z.array(optionSchema).min(2).max(4),
});

export const eventsFileSchema = z.array(eventSchema);

export type TrailEvent = z.infer<typeof eventSchema>;
