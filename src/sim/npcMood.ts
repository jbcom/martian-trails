import type { Rng } from "@/core/rng";
import type { MartianNpc } from "@/schemas/encounter";
import type { DirectorResource } from "@/sim/eventDirector";

export interface NpcMoodState {
  sol: number;
  lowResources: ReadonlySet<DirectorResource>;
  resourceRatios: Partial<Record<DirectorResource, number>>;
}

export interface NpcMood {
  greed: number;
  desperation: number;
  aggression: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function scarcity(state: NpcMoodState, resource: DirectorResource): number {
  const ratio = state.resourceRatios[resource];
  if (ratio === undefined) return state.lowResources.has(resource) ? 1 : 0;
  return clamp01(1 - ratio);
}

/**
 * M8-7 fuzzy mood variables for roadside NPC arbitration.
 *
 * These are not displayed as truth to the player. They are the small fuzzy layer under the
 * diegetic encounter roll: a stranded hauler becomes more likely when vitals are poor, a
 * scavenger smells weakness when hull/morale are brittle, and a trader/rival likes a richer
 * expedition because there is something worth bargaining over.
 */
export function moodForRunState(state: NpcMoodState): NpcMood {
  const vitalNeed =
    (scarcity(state, "oxygen") + scarcity(state, "water") + scarcity(state, "rations")) / 3;
  const supportNeed = (scarcity(state, "parts") + scarcity(state, "medkits")) / 2;
  const moraleNeed = scarcity(state, "morale");
  const hullNeed = scarcity(state, "hull");
  const partsSurplus = clamp01((state.resourceRatios.parts ?? 0) - 0.35);
  const vitalSurplus = clamp01(
    ((state.resourceRatios.oxygen ?? 0) +
      (state.resourceRatios.water ?? 0) +
      (state.resourceRatios.rations ?? 0)) /
      3 -
      0.55,
  );

  return {
    greed: clamp01(0.2 + partsSurplus + vitalSurplus * 0.75),
    desperation: clamp01(0.2 + vitalNeed * 0.9 + supportNeed * 0.45 + moraleNeed * 0.25),
    aggression: clamp01(0.15 + hullNeed * 0.45 + moraleNeed * 0.35 + supportNeed * 0.25),
  };
}

export function scoreNpcEncounter(npc: MartianNpc, state: NpcMoodState): number {
  const mood = moodForRunState(state);
  const weight = (intent: string) => npc.goalWeights[intent] ?? 0;
  let score = 0.4;

  score += weight("trade") * (0.75 + mood.greed * 1.1);
  score += weight("beg") * (0.75 + mood.desperation * 1.25);
  score += weight("warn") * (0.6 + Math.min(1, state.sol / 32) * 0.8);
  score += weight("raid") * (0.5 + mood.aggression * 1.5);

  if (npc.archetype === "stranded") score += mood.desperation * 0.8;
  if (npc.archetype === "scavenger") score += mood.aggression * 0.7;
  if (npc.archetype === "trader") score += Math.max(mood.greed, mood.desperation) * 0.45;
  if (npc.archetype === "rival") score += Math.min(1, state.sol / 30) * 0.55;

  return Math.max(0.05, score);
}

export function pickMoodedNpc(
  npcs: readonly MartianNpc[],
  state: NpcMoodState,
  rng: Rng,
): MartianNpc | null {
  if (npcs.length === 0) return null;
  const weighted = npcs.map((npc) => ({ npc, score: scoreNpcEncounter(npc, state) }));
  const total = weighted.reduce((sum, item) => sum + item.score, 0);
  let cursor = rng.range(0, total);
  for (const item of weighted) {
    cursor -= item.score;
    if (cursor <= 0) return item.npc;
  }
  return weighted.at(-1)?.npc ?? null;
}
