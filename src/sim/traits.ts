/**
 * koota traits — the entire expedition state, decomposed by concern. The systems in
 * src/sim/systems read and write these; nothing here imports three/react/DOM.
 *
 * Primitive-field traits use koota's struct schema (one typed array per field). Compound
 * state (crew roster, upgrade flags, the rng) uses an AoS-factory trait — `() => value` —
 * so each entity gets its own object/array instance, not a shared reference.
 */

import { trait } from "koota";
import { createRng, type Rng } from "@/core/rng";

/** Consumable + structural pools. Mirrors the POC `state.resources`. */
export const Resources = trait({
  oxygen: 0,
  water: 0,
  rations: 0,
  power: 0,
  parts: 0,
  medkits: 0,
  morale: 100,
  hull: 100,
  rtg: 1,
});

/** Per-pool maxima. Power max is derived from RTG count at spawn. */
export const MaxResources = trait({
  oxygen: 1000,
  water: 1000,
  rations: 1000,
  power: 100,
  morale: 100,
  hull: 100,
});

/** Where on the trail we are. */
export const Position = trait({
  /** Kilometers traveled toward the terminus. */
  distance: 0,
  /** Martian day counter (POC `state.sol`, 1-based). */
  sol: 1,
  /** Index into terrain.outposts of the next un-reached waypoint. */
  nextOutpost: 0,
});

/** The everyday dials (POC `state.pace` / `state.rationLevel`), stored as config keys. */
export const Travel = trait({
  /** Key into travel.pace (e.g. "steady"). */
  pace: "steady",
  /** Key into travel.rations (e.g. "filling"). */
  rationLevel: "filling",
  /** Whether the rover is under power this Sol (drives power/hull/distance). */
  driving: true,
});

/** Current drivable zone (POC `state.terrain`), stored as an index into terrain.zones. */
export const Terrain = trait({ zone: 0 });

/**
 * Engine Sol-clock accumulator (seconds of wall-time banked toward the next Sol). Lives in a
 * trait because koota entities are numeric handles, not objects, so a WeakMap can't key them.
 */
export const SolClock = trait({ accumulator: 0 });

/** Weather affects recharge, cold, and event flavor. "clear" | "dust_storm". */
export const Weather = trait({ kind: "clear" });

/** Win/lose latch. status "running" until a terminal condition fires. */
export const Outcome = trait({
  /** "running" | "won" | "lost". */
  status: "running",
  /** Human-readable cause set when status leaves "running". */
  reason: "",
  /** Final score, populated by the scoring system on "won". */
  score: 0,
});

/** One crew member's mutable run state (the config holds the immutable traits). */
export interface CrewState {
  /** Matches a crew.roster id. */
  id: string;
  alive: boolean;
  /** Condition id from illness.conditions, or "healthy". */
  condition: string;
  /** 0..1 condition severity; 0 while healthy, climbs while afflicted. */
  severity: number;
}

/** The crew roster as run state. AoS factory → each entity owns its own array. */
export const Crew = trait<() => CrewState[]>(() => []);

/** Installed upgrade flags keyed by upgrade id. AoS factory → own object per entity. */
export const Upgrades = trait<() => Record<string, boolean>>(() => ({}));

/**
 * Mission sponsor parameters carried into the run (the Oregon Trail profession analog).
 * The score multiplier scales the terminus UNOMA rating — a leaner-budget sponsor earns a
 * higher multiplier, so risk trades against prestige. Set once at spawn from the loadout.
 */
export const Sponsor = trait({ scoreMultiplier: 1 });

/**
 * Per-ability cooldown bookkeeping: the Sol on which each crew active ability was last used,
 * keyed by crew id (`{}` = never used). AoS factory → own object per entity so cooldowns
 * don't leak across runs/tests.
 */
export const AbilityCooldowns = trait<() => Record<string, number>>(() => ({}));

export interface EncounterState {
  active: boolean;
  npcId: string;
  /** NPC position in scene space, written by encounterAI each tick. */
  npcX: number;
  npcY: number;
  npcZ: number;
}

/**
 * Active NPC encounter state. When active=true, the rover is halted and an NPC is steering
 * toward it. npcX/npcY/npcZ track the NPC's sim position (written by encounterAI per tick).
 * sim-owned, serialized for save/restore.
 */
export const Encounter = trait<() => EncounterState>(() => ({
  active: false,
  npcId: "",
  npcX: 12,
  npcY: 0,
  npcZ: 0,
}));

/**
 * The expedition's seeded rng. AoS factory holds the live stream; never serialized.
 * The factory default is a placeholder stream — `spawnExpedition` always supplies the real
 * seeded rng, which replaces it. (koota invokes the factory to build the store default even
 * when a value is provided, so the default must be constructible, not a throw.)
 */
export const RngSource = trait<() => Rng>(() => createRng("__rng_placeholder__"));
