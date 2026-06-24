/**
 * Per-Sol illness progression + death rolls (POC sickness loop + low-morale kill). Un-stubs
 * the POC's flat conditions into the typed table (illness.json): each afflicted member's
 * severity climbs by its condition's progression rate, and a per-Sol mortality roll (typed,
 * not the POC's single 0.15) decides death. A separate low-morale roll can kill at morale<=10.
 *
 * Randomness comes from a forked rng stream so illness draws never disturb other systems'
 * sequences — determinism is preserved per-system.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import type { Rng } from "@/core/rng";
import { Crew, Resources, RngSource } from "../traits";
import { clamp } from "./helpers";

const conditionById = new Map(config.illness.conditions.map((c) => [c.id, c]));

export function illnessSystem(expedition: Entity): void {
  const crew = expedition.get(Crew);
  const res = expedition.get(Resources);
  const baseRng = expedition.get(RngSource);
  if (!crew || !res || !baseRng) return;

  // Fork per Sol so the illness stream is independent of pace/event draws.
  const rng: Rng = baseRng.fork(`illness:${expedition.get(Resources)?.morale ?? 0}:sol`);

  let morale = res.morale;
  const ill = config.illness;

  for (const member of crew) {
    if (!member.alive || member.condition === "healthy") continue;
    const cond = conditionById.get(member.condition);
    if (!cond) continue;

    // Progress severity toward critical.
    member.severity = Math.min(ill.criticalSeverity, member.severity + cond.progressionPerSol);

    if (rng.chance(cond.mortalityPerSol)) {
      member.alive = false;
      member.severity = 0;
      morale -= cond.moralePenaltyOnDeath;
    } else {
      morale -= cond.moralePenaltyPerSol;
    }
  }

  // Low-morale crew-death roll (POC: morale<=10 → 10% kill a random living crew).
  const living = crew.filter((c) => c.alive);
  if (
    living.length > 0 &&
    morale <= ill.lowMoraleThreshold &&
    rng.chance(ill.lowMoraleDeathChance)
  ) {
    const victim = rng.pick(living);
    victim.alive = false;
    victim.severity = 0;
  }

  expedition.set(Crew, crew);
  expedition.set(Resources, { morale: clamp(morale, config.resources.max.morale) });
}
