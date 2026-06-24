import { z } from "zod";

/**
 * In-progress run save (m7 hardening) — the snapshot taken on every meaningful run
 * beat (each Sol advance / screen change / before unload) so a browser refresh mid-run
 * resumes from exact state rather than losing many minutes of play.
 *
 * The shape is a plain-JSON capture of the expedition entity's serializable traits plus
 * the run controller's progression bookkeeping (which events/hazards/outposts have fired,
 * the event-clock cursor). The live rng streams are NOT serialized — instead the live
 * trait values are persisted directly, so resume continues from the exact realized state
 * (the run already happened; re-deriving rng position is unnecessary and brittle).
 *
 * Every field is validated on load (persistence.load → zod.parse), so a corrupt or
 * stale save degrades to "no save" rather than crashing or resuming a malformed run.
 */

/** One crew member's mutable run state (mirrors CrewState). */
export const crewSaveSchema = z.object({
  id: z.string(),
  alive: z.boolean(),
  condition: z.string(),
  severity: z.number(),
});

/** The consumable + structural pools (mirrors the Resources trait). */
export const resourcesSaveSchema = z.object({
  oxygen: z.number(),
  water: z.number(),
  rations: z.number(),
  power: z.number(),
  parts: z.number(),
  medkits: z.number(),
  morale: z.number(),
  hull: z.number(),
  rtg: z.number(),
});

/** Per-pool maxima (mirrors MaxResources). */
export const maxResourcesSaveSchema = z.object({
  oxygen: z.number(),
  water: z.number(),
  rations: z.number(),
  power: z.number(),
  morale: z.number(),
  hull: z.number(),
});

/** The complete resumable run state. */
export const runSaveSchema = z.object({
  /** Save format version — bump to invalidate older saves cleanly. */
  version: z.literal(1),
  /** The run seed (deterministic sim foundation; rebuilds the rng streams on restore). */
  seed: z.string(),
  /** Wall-clock the save was written (for any future "saved N ago" copy). */
  savedAt: z.number(),

  resources: resourcesSaveSchema,
  maxResources: maxResourcesSaveSchema,
  position: z.object({
    distance: z.number(),
    sol: z.number(),
    nextOutpost: z.number(),
  }),
  travel: z.object({
    pace: z.string(),
    rationLevel: z.string(),
    driving: z.boolean(),
  }),
  terrain: z.object({ zone: z.number() }),
  weather: z.object({ kind: z.string() }),
  outcome: z.object({
    status: z.string(),
    reason: z.string(),
    score: z.number(),
  }),
  crew: z.array(crewSaveSchema),
  upgrades: z.record(z.string(), z.boolean()),
  sponsor: z.object({ scoreMultiplier: z.number() }),
  abilityCooldowns: z.record(z.string(), z.number()),
  solClock: z.object({ accumulator: z.number() }),

  /** Run-controller progression bookkeeping — so resume doesn't re-fire past beats. */
  progress: z.object({
    lastEventSol: z.number(),
    seenEvents: z.array(z.string()),
    resolvedHazards: z.array(z.string()),
    dockedOutposts: z.array(z.string()),
    evaCount: z.number(),
  }),
});

export type RunSave = z.infer<typeof runSaveSchema>;
