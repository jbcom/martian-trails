/**
 * Pure crew active-ability resolution (GAME-DESIGN.md §2 M10). Each crew role contributes one
 * active, player-triggered ability (Rally Crew, Jury-Rig, Deep Prospect, Emergency Harvest)
 * with config-driven costs/effects and a per-ability Sol cooldown. This module is pure: it
 * computes affordability + the resource patch from the live resources and the cooldown
 * bookkeeping; the run controller is the only thing that writes the patch + Sols back to the
 * entity, exactly like the event/hazard/outpost resolvers.
 */

import { config } from "@/config";
import type { Ability } from "@/schemas/ability";
import { applyEffects, type EventResources } from "@/sim/event";
import type { CrewState } from "@/sim/traits";

/** The ability bound to a crew member, or undefined if that role grants none. */
export function abilityForCrew(crewId: string): Ability | undefined {
  return config.abilities.abilities.find((a) => a.crewId === crewId);
}

/** Why an ability can't be used right now (or null = usable). */
export type AbilityBlock = "dead" | "cooldown" | "afford" | null;

/**
 * Evaluate whether `crewId`'s ability can be used: the member must be alive, off cooldown
 * (current Sol ≥ lastUsedSol + cooldownSols), and able to pay every negative-delta cost
 * (the resource can't go below 0). Returns the blocking reason, or null if usable.
 */
export function abilityBlock(
  ability: Ability,
  crew: CrewState | undefined,
  current: EventResources,
  sol: number,
  lastUsedSol: number | undefined,
): AbilityBlock {
  if (!crew?.alive) return "dead";
  if (lastUsedSol != null && sol < lastUsedSol + ability.cooldownSols) return "cooldown";
  for (const effect of ability.effects) {
    if (effect.delta < 0 && (current[effect.target] ?? 0) + effect.delta < 0) return "afford";
  }
  return null;
}

/** Sols remaining on an ability's cooldown (0 = ready). */
export function cooldownRemaining(
  ability: Ability,
  sol: number,
  lastUsedSol: number | undefined,
): number {
  if (lastUsedSol == null) return 0;
  return Math.max(0, lastUsedSol + ability.cooldownSols - sol);
}

/**
 * Resolve an ability use: apply its resource effects to the live resources, clamped to
 * maxima. Pure — returns the patch the controller writes back (plus the controller handles
 * the Sols, the cooldown stamp, and the one-shot `sets` buff, which touch other traits).
 */
export function resolveAbility(
  ability: Ability,
  current: EventResources,
  maxPower: number,
): Partial<EventResources> {
  return applyEffects(current, ability.effects, maxPower);
}
