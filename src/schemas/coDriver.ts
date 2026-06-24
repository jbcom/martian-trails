import { z } from "zod";

export const coDriverIdSchema = z.string().regex(/^codriver:[a-z0-9-]+$/);

export const coDriverTriggerSchema = z.enum([
  "low-oxygen",
  "low-water",
  "low-rations",
  "low-hull",
  "high-pace",
  "tight-rations",
  "steady",
]);

export const coDriverLoadoutPatchSchema = z
  .object({
    oxygen: z.number().int().optional(),
    water: z.number().int().optional(),
    rations: z.number().int().optional(),
    parts: z.number().int().optional(),
    medkits: z.number().int().optional(),
    rtg: z.number().int().optional(),
  })
  .default({});

export const coDriverAdviceLineSchema = z.object({
  trigger: coDriverTriggerSchema,
  line: z.string().min(1).max(180),
  misleadingLine: z.string().min(1).max(180),
  reliability: z.number().min(0).max(1),
});

export const coDriverSchema = z.object({
  id: coDriverIdSchema,
  name: z.string().min(1).max(32),
  role: z.string().min(1).max(40),
  portrait: z.string().min(1).max(32),
  summary: z.string().min(1).max(160),
  tradeoff: z.string().min(1).max(120),
  recruitLine: z.string().min(1).max(180),
  loadoutPatch: coDriverLoadoutPatchSchema,
  advice: z.array(coDriverAdviceLineSchema).min(1),
});

export const coDriversFileSchema = z.array(coDriverSchema).min(1);

export type CoDriverId = z.infer<typeof coDriverIdSchema>;
export type CoDriverTrigger = z.infer<typeof coDriverTriggerSchema>;
export type CoDriverLoadoutPatch = z.infer<typeof coDriverLoadoutPatchSchema>;
export type CoDriverAdviceLine = z.infer<typeof coDriverAdviceLineSchema>;
export type CoDriver = z.infer<typeof coDriverSchema>;
