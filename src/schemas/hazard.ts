import { z } from "zod";

/**
 * Hazard-traverse content schema — the river-crossing equivalent (GAME-DESIGN.md §2 M5,
 * §5). A hazard is DATA (src/config/hazards.json): a named impassable Mars terrain feature
 * with a *visible read stat* (the analog to "the river looks deep") and 3–4 approach
 * options, each with a distinct cost axis and a seeded success/partial/fail outcome
 * distribution that SCALES with the read stat. The pure resolver (src/sim/hazard.ts)
 * interprets this — "code interprets content, never embeds it".
 *
 * Outcome probabilities are expressed as a base distribution plus a `readScaling` that
 * tilts mass from success toward fail as the read stat climbs (a deeper crevasse / denser
 * storm / thinner ice is more dangerous). The resolver normalizes the tilted weights, so
 * the JSON author tunes feel without hand-balancing every probability triple.
 */

/** A signed resource delta an outcome applies (mirrors the event effect vocabulary). */
export const hazardEffectSchema = z.object({
  target: z.enum(["oxygen", "water", "rations", "power", "morale", "hull", "parts", "medkits"]),
  delta: z.number(),
});
export type HazardEffect = z.infer<typeof hazardEffectSchema>;

/** A single outcome band (success / partial / fail) for a chosen option. */
export const hazardOutcomeSchema = z.object({
  /** Outcome tier — drives the UI consequence framing + log tone. */
  tier: z.enum(["success", "partial", "fail"]),
  /** Base selection weight before read-stat scaling (relative, not a probability). */
  weight: z.number().min(0),
  /**
   * How this band's weight responds to the read stat (−1..1). Positive bands gain weight as
   * the read climbs (fail gets likelier on a worse read); negative bands lose it (success
   * gets rarer). Applied as `weight * (1 + readScaling * read)`, floored at 0.
   */
  readScaling: z.number().min(-1).max(1).default(0),
  /** Human log line shown as the animated consequence resolves. */
  log: z.string().min(1).max(160),
  /** Resource deltas applied on this outcome (clamped to pool maxima by the resolver). */
  effects: z.array(hazardEffectSchema).default([]),
  /** Extra Sols this outcome costs (a botched attempt burns days). */
  solsCost: z.number().min(0).default(0),
  /** Distance (km) lost or gained — negative = a detour set the rover back. */
  distanceDelta: z.number().default(0),
});
export type HazardOutcome = z.infer<typeof hazardOutcomeSchema>;

/** One approach the player can pick (Ford / Bridge / Detour / Winch). */
export const hazardOptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(32),
  /** One-line description of the approach + its tradeoff, shown under the button. */
  blurb: z.string().min(1).max(120),
  /** Upfront, guaranteed cost paid the moment the option is chosen (before the roll). */
  upfront: z.array(hazardEffectSchema).default([]),
  /** Upfront Sols spent regardless of outcome (e.g. a detour always costs days). */
  upfrontSols: z.number().min(0).default(0),
  /** ≥1 outcome band; weights tilt by the read stat at resolve time. */
  outcomes: z.array(hazardOutcomeSchema).min(1),
});
export type HazardOption = z.infer<typeof hazardOptionSchema>;

/** A named hazard type (crevasse / dust-storm wall / regolith bog / ice sheet / scarp). */
export const hazardSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Display name (e.g. "Noctis Chasma"). */
  name: z.string().min(1).max(40),
  /** Family — drives the rendered terrain motif + read-gauge label. */
  kind: z.enum(["crevasse", "dustStorm", "regolithBog", "iceSheet", "scarp"]),
  /** Framing description shown above the read gauge. */
  description: z.string().min(1).max(240),
  /** The label of the visible read stat (e.g. "Width", "Density", "Ice Thickness"). */
  readLabel: z.string().min(1).max(24),
  /** Km on the route at which this hazard is raised (the rover halts on reaching it). */
  distance: z.number().min(0),
  options: z.array(hazardOptionSchema).min(3).max(4),
});
export type Hazard = z.infer<typeof hazardSchema>;

export const hazardsFileSchema = z.object({
  hazards: z.array(hazardSchema).min(1),
  /** Tolerance (km) within which a hazard's distance counts as reached. */
  triggerWindow: z.number().min(1).default(40),
});
export type HazardsConfig = z.infer<typeof hazardsFileSchema>;
