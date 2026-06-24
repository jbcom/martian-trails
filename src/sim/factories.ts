/**
 * Expedition entity spawn. Builds the full trait set from the validated config plus a seed,
 * so a given (config, seed, loadout) always produces an identical starting world — the
 * foundation of the determinism the tests rely on.
 */

import type { Entity, World } from "koota";
import { config } from "@/config";
import { createRng } from "@/core/rng";
import {
  AbilityCooldowns,
  Crew,
  type CrewState,
  Encounter,
  MaxResources,
  Outcome,
  Position,
  Resources,
  RngSource,
  SolClock,
  Sponsor,
  Terrain,
  Travel,
  Upgrades,
  Weather,
} from "./traits";

/** Starting cargo + rover loadout, normally produced by the depot provisioning screen. */
export interface Loadout {
  oxygen: number;
  water: number;
  rations: number;
  parts: number;
  medkits: number;
  /** RTG cells installed; each adds `resources.maxPowerPerRtg` to the power pool. */
  rtg: number;
  /** Upgrade ids that were purchased and installed. */
  upgrades: string[];
  /** The chosen sponsor's terminus score multiplier (UNOMA=×1, leaner sponsors more). */
  scoreMultiplier?: number;
  pace?: string;
  rationLevel?: string;
}

/** A sensible default loadout for tests / a fresh run (no upgrades, 1 RTG). */
export function defaultLoadout(): Loadout {
  return {
    oxygen: 500,
    water: 500,
    rations: 500,
    parts: 5,
    medkits: 3,
    rtg: 1,
    upgrades: [],
  };
}

/** Fresh, all-healthy crew run state derived from the roster config. */
function spawnCrewState(): CrewState[] {
  return config.crew.roster.map((member) => ({
    id: member.id,
    alive: true,
    condition: "healthy",
    severity: 0,
  }));
}

/** Upgrade flag map with every catalog id present, set true only for installed ones. */
function spawnUpgrades(installed: readonly string[]): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const upg of config.upgrades.catalog) flags[upg.id] = installed.includes(upg.id);
  return flags;
}

/**
 * Spawn the expedition entity. `seed` makes every downstream random draw reproducible;
 * the entity carries its own forked rng stream in the RngSource trait.
 */
export function spawnExpedition(
  world: World,
  seed: string,
  loadout: Loadout = defaultLoadout(),
): Entity {
  const maxPower = loadout.rtg * config.resources.maxPowerPerRtg;
  const rng = createRng(`expedition:${seed}`);

  return world.spawn(
    Resources({
      oxygen: loadout.oxygen,
      water: loadout.water,
      rations: loadout.rations,
      power: maxPower,
      parts: loadout.parts,
      medkits: loadout.medkits,
      morale: config.resources.max.morale,
      hull: config.resources.max.hull,
      rtg: loadout.rtg,
    }),
    MaxResources({
      oxygen: config.resources.max.oxygen,
      water: config.resources.max.water,
      rations: config.resources.max.rations,
      power: maxPower,
      morale: config.resources.max.morale,
      hull: config.resources.max.hull,
    }),
    Position({ distance: 0, sol: 1, nextOutpost: 0 }),
    Travel({
      pace: loadout.pace ?? "steady",
      rationLevel: loadout.rationLevel ?? "filling",
      driving: true,
    }),
    Terrain({ zone: 0 }),
    SolClock({ accumulator: 0 }),
    Weather({ kind: "clear" }),
    Outcome({ status: "running", reason: "", score: 0 }),
    Crew(spawnCrewState()),
    Upgrades(spawnUpgrades(loadout.upgrades)),
    Sponsor({ scoreMultiplier: loadout.scoreMultiplier ?? 1 }),
    AbilityCooldowns({}),
    Encounter(),
    RngSource(rng),
  );
}
