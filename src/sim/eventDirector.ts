import type { Rng } from "@/core/rng";
import type { TrailEvent } from "@/schemas/event";

export type DirectorResource =
  | "oxygen"
  | "water"
  | "rations"
  | "power"
  | "morale"
  | "hull"
  | "parts"
  | "medkits";

export interface EventDirectorState {
  sol: number;
  daysSinceEvent: number;
  lowResources: ReadonlySet<DirectorResource>;
  resourceRatios: Partial<Record<DirectorResource, number>>;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scarcity(state: EventDirectorState, resource: DirectorResource): number {
  const ratio = state.resourceRatios[resource];
  if (ratio === undefined) return state.lowResources.has(resource) ? 1 : 0;
  return clamp01(1 - ratio);
}

function anyScarcity(state: EventDirectorState, resources: readonly DirectorResource[]): number {
  return Math.max(...resources.map((resource) => scarcity(state, resource)));
}

/**
 * M8-6 event director: pure desirability scoring for trail events.
 *
 * Frequency is still controlled by the existing seeded event-chance roll; this replaces the
 * uniform "which event?" pick with a state-sensitive score. The score prefers events that
 * speak to the current run pressure: supply caches when vitals are thin, mechanical beats
 * when hull/parts are poor, crew conflict when morale is brittle, and so on.
 */
export function scoreTrailEvent(event: TrailEvent, state: EventDirectorState): number {
  const tags = new Set(event.tags);
  const vitalScarcity = anyScarcity(state, ["oxygen", "water", "rations"]);
  const powerScarcity = scarcity(state, "power");
  const hullScarcity = scarcity(state, "hull");
  const partsScarcity = scarcity(state, "parts");
  const moraleScarcity = scarcity(state, "morale");
  const medkitScarcity = scarcity(state, "medkits");

  let score = 1;

  if (tags.has("supply-cache")) score += 2.2 * Math.max(vitalScarcity, medkitScarcity);
  if (tags.has("scavenging")) score += 1.8 * Math.max(vitalScarcity, partsScarcity);
  if (tags.has("mechanical-failure")) score += 1.9 * Math.max(partsScarcity, hullScarcity);
  if (tags.has("seal-failure")) score += 1.8 * Math.max(scarcity(state, "oxygen"), hullScarcity);
  if (tags.has("power")) score += 2.0 * powerScarcity;
  if (tags.has("crew-conflict")) score += 2.1 * moraleScarcity;
  if (tags.has("thermal")) score += 0.7 + 0.6 * Math.min(1, state.sol / 35);
  if (tags.has("navigation")) score += 0.7 + 0.5 * Math.min(1, state.sol / 30);
  if (tags.has("radiation") || tags.has("solar-flare"))
    score += 0.5 + 0.5 * Math.min(1, state.sol / 28);
  if (tags.has("dust-storm")) score += 0.5 + 0.4 * Math.min(1, state.sol / 24);

  // Long quiet stretches should pick a more pointed beat once the chance roll finally hits.
  score += Math.min(1.4, Math.max(0, state.daysSinceEvent - 1) * 0.08);

  return Math.max(0.05, score);
}

export function pickDirectedEvent(
  events: readonly TrailEvent[],
  state: EventDirectorState,
  rng: Rng,
): TrailEvent | null {
  if (events.length === 0) return null;
  const weighted = events.map((event) => ({ event, score: scoreTrailEvent(event, state) }));
  const total = weighted.reduce((sum, item) => sum + item.score, 0);
  let cursor = rng.range(0, total);
  for (const item of weighted) {
    cursor -= item.score;
    if (cursor <= 0) return item.event;
  }
  return weighted.at(-1)?.event ?? null;
}
