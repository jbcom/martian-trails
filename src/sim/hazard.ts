/**
 * Pure hazard-traverse resolution — the river-crossing equivalent (GAME-DESIGN.md §2 M5).
 * Given a hazard, a chosen option, the visible "read" stat, and a seeded rng, it produces a
 * deterministic outcome: a resource patch, the Sols and distance the attempt cost, and the
 * outcome tier + log for the UI to dramatize. No koota, no React, no three — the run
 * controller is the only thing that writes the result back to the entity, exactly like
 * src/sim/event.ts.
 *
 * The seeded distribution scales with the read: each outcome band's selection weight is
 * tilted by `readScaling * read`, so a wide chasm / dense storm / thin ice shifts mass from
 * success toward fail. The author tunes feel in JSON; the code interprets it.
 */

import { config } from "@/config";
import type { Rng } from "@/core/rng";
import type { Hazard, HazardEffect, HazardOption, HazardOutcome } from "@/schemas/hazard";
import { applyEffects, type EventResources } from "@/sim/event";

/** The fully resolved result of a traverse attempt. */
export interface HazardResult {
  /** The outcome band that fired. */
  tier: HazardOutcome["tier"];
  /** Flavor log for the animated consequence. */
  log: string;
  /** Resource patch to write back (upfront + outcome effects, clamped to maxima). */
  patch: Partial<EventResources>;
  /** Total Sols the attempt cost (option upfront + outcome). */
  solsCost: number;
  /** Net distance change (km); negative = a detour set the rover back. */
  distanceDelta: number;
  /** The option that was chosen (echoed for the UI / log). */
  optionId: string;
}

/** Clamp the read stat into the valid 0..1 range the scaling assumes. */
function clampRead(read: number): number {
  return Math.max(0, Math.min(1, read));
}

/**
 * Read-tilted selection weight for one band. `weight * (1 + readScaling * read)`, floored
 * at 0 so a strongly-negative scaling can't produce a negative weight. A success band with
 * readScaling −0.6 loses 60% of its weight at read=1; a fail band with +0.9 nearly doubles.
 */
export function scaledWeight(outcome: HazardOutcome, read: number): number {
  const w = outcome.weight * (1 + outcome.readScaling * clampRead(read));
  return Math.max(0, w);
}

/** Weighted pick over the option's outcome bands using the seeded rng. */
function pickOutcome(option: HazardOption, read: number, rng: Rng): HazardOutcome {
  const weights = option.outcomes.map((o) => scaledWeight(o, read));
  const total = weights.reduce((a, b) => a + b, 0);
  // Degenerate guard: every band scaled to 0 → fall back to the first band uniformly.
  if (total <= 0) return option.outcomes[0];
  let roll = rng.next() * total;
  for (let i = 0; i < option.outcomes.length; i++) {
    roll -= weights[i];
    if (roll < 0) return option.outcomes[i];
  }
  return option.outcomes[option.outcomes.length - 1];
}

/** Resolve a hazard from the config by id, or undefined if unknown. */
export function findHazard(id: string): Hazard | undefined {
  return config.hazards.hazards.find((h) => h.id === id);
}

/**
 * Resolve a traverse. `read` is the 0..1 stat the player saw on the gauge (the run
 * controller derives it deterministically and passes it in, so the same gauge the player
 * read is the same one the math uses). `maxPower` is the entity's RTG-derived power ceiling
 * for clamping. Determinism: same (hazard, optionId, read, rng-state) → same result.
 */
export function resolveHazard(
  hazard: Hazard,
  optionId: string,
  read: number,
  current: EventResources,
  rng: Rng,
  maxPower: number,
): HazardResult {
  const option = hazard.options.find((o) => o.id === optionId);
  if (!option) {
    throw new Error(`resolveHazard: option "${optionId}" not in hazard "${hazard.id}"`);
  }

  const outcome = pickOutcome(option, read, rng);

  // Combine the upfront (guaranteed) effects with the outcome's effects, then clamp once
  // against the live resources so two deltas to the same pool compose correctly.
  const allEffects: HazardEffect[] = [...option.upfront, ...outcome.effects];
  const patch = applyEffects(current, allEffects, maxPower);

  return {
    tier: outcome.tier,
    log: outcome.log,
    patch,
    solsCost: option.upfrontSols + outcome.solsCost,
    distanceDelta: outcome.distanceDelta,
    optionId,
  };
}
