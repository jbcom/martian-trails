import { z } from "zod";

/**
 * Sponsor / difficulty schema — the Oregon Trail profession analog. Each sponsor
 * sets the provisioning budget and a terminal score multiplier (less funding =
 * harder = higher score). Kept separate from the core config bundle so it loads
 * independently. Validated where consumed (src/content/sponsors.ts).
 */
export const sponsorSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  blurb: z.string().min(1),
  budget: z.number().int().positive(),
  scoreMultiplier: z.number().positive(),
});

export const sponsorsFileSchema = z.object({
  roster: z.array(sponsorSchema).min(1),
});

export type Sponsor = z.infer<typeof sponsorSchema>;
