/**
 * Pure EVA-prospecting resolution — the hunting equivalent (GAME-DESIGN.md §2 M6). The
 * structure mirrors the hunt: spend a consumable (O₂ = ammo + clock), a skill phase (scan to
 * locate, drill to extract), a hard carry cap on yield, and an over-stay injury risk. All
 * resolution is pure functions over an EvaSession value object + a seeded rng — no koota, no
 * React, no three. The run controller holds one session and writes the banked haul back to
 * the entity on return, exactly like the hazard + event resolvers.
 *
 * The deposit field is seeded ONCE at startEva from the run's rng, so the same seed lays the
 * same map. `scan` reveals proximity (hot/cold) toward the nearest live deposit; `drill`
 * extracts from the deposit under the cursor if one is there. Determinism: the field, every
 * scan reveal, and every injury roll come from the seeded stream threaded through the session.
 */

import { config } from "@/config";
import type { Rng } from "@/core/rng";
import type { DepositType } from "@/schemas/eva";

/** A single seeded deposit placed in the field. */
export interface Deposit {
  /** Cell coords in the gridSize×gridSize field. */
  x: number;
  y: number;
  /** Deposit type id (into config.eva.deposits). */
  typeId: string;
  /** Drills remaining before exhausted (starts at the type's capacity). */
  remaining: number;
  /** Whether a scan has ever revealed this deposit's exact cell. */
  found: boolean;
}

/** The running haul, banked into resources only on a successful return. */
export interface Haul {
  water: number;
  parts: number;
  score: number;
  /** Carry-mass accumulated toward the cap. */
  mass: number;
  /** Count of deposits drilled (for the UI tally). */
  drills: number;
}

/** Proximity feedback returned by a scan: how close the cursor is to ore. */
export type ScanHeat = "hot" | "warm" | "cold" | "none";

/** The full EVA session — a pure value object the controller threads through actions. */
export interface EvaSession {
  /** Remaining suit O₂ (ammo + clock). EVA ends when this hits 0. */
  o2: number;
  /** Grid dimension. */
  gridSize: number;
  /** The seeded deposit field. */
  deposits: Deposit[];
  /** Running haul (un-banked until endEva). */
  haul: Haul;
  /** A crew member id that got injured this EVA, or null. */
  injuredCrew: string | null;
  /** Whether the session has ended (returned or O₂ out). */
  ended: boolean;
  /** The seeded rng stream, advanced by each action so the run stays deterministic. */
  rng: Rng;
}

/** Whether the haul has reached the carry cap (drilling locked until return). */
export function isCarryFull(session: EvaSession): boolean {
  return session.haul.mass >= config.eva.carryCap;
}

/** Look up a deposit type definition by id. */
function depositType(typeId: string): DepositType {
  const t = config.eva.deposits.find((d) => d.id === typeId);
  if (!t) throw new Error(`eva: unknown deposit type "${typeId}"`);
  return t;
}

/** Weighted pick of a deposit type id from the config field. */
function pickDepositType(rng: Rng): DepositType {
  const types = config.eva.deposits;
  const total = types.reduce((a, t) => a + t.weight, 0);
  let roll = rng.next() * total;
  for (const t of types) {
    roll -= t.weight;
    if (roll < 0) return t;
  }
  return types[types.length - 1];
}

/**
 * Begin an EVA. Seeds the deposit field from `rng` (forked by the controller so EVAs don't
 * collide with the event stream) and caps the O₂ budget at the rover's available O₂ so you
 * can't prospect on air you don't have.
 */
export function startEva(rng: Rng, availableO2: number): EvaSession {
  const cfg = config.eva;
  const o2 = Math.max(0, Math.min(cfg.o2Budget, availableO2));
  const deposits: Deposit[] = [];
  const taken = new Set<string>();
  // Place depositCount deposits on distinct cells.
  let guard = 0;
  while (deposits.length < cfg.depositCount && guard < cfg.depositCount * 50) {
    guard++;
    const x = rng.int(0, cfg.gridSize - 1);
    const y = rng.int(0, cfg.gridSize - 1);
    const key = `${x},${y}`;
    if (taken.has(key)) continue;
    taken.add(key);
    const type = pickDepositType(rng);
    deposits.push({ x, y, typeId: type.id, remaining: type.capacity, found: false });
  }
  return {
    o2,
    gridSize: cfg.gridSize,
    deposits,
    haul: { water: 0, parts: 0, score: 0, mass: 0, drills: 0 },
    injuredCrew: null,
    ended: false,
    rng,
  };
}

/** Chebyshev (king-move) distance from a cell to the nearest live deposit. */
function nearestLiveDistance(session: EvaSession, x: number, y: number): number | null {
  let best: number | null = null;
  for (const d of session.deposits) {
    if (d.remaining <= 0) continue;
    const dist = Math.max(Math.abs(d.x - x), Math.abs(d.y - y));
    if (best === null || dist < best) best = dist;
  }
  return best;
}

/** Classify a Chebyshev distance into hot/warm/cold feedback. */
export function heatForDistance(dist: number | null): ScanHeat {
  if (dist === null) return "none";
  if (dist === 0) return "hot";
  if (dist <= 1) return "hot";
  if (dist <= 2) return "warm";
  return "cold";
}

/**
 * Run the over-stay injury roll once O₂ is at/below the threshold. Returns an injured crew id
 * or null. Pure: draws from the session rng. The caller decides which crew to apply it to;
 * here we just roll the chance (the controller maps it to a living member).
 */
function rollInjury(session: EvaSession): boolean {
  const cfg = config.eva;
  if (session.o2 > cfg.injuryO2Threshold) return false;
  return session.rng.chance(cfg.injuryChancePerAction);
}

/**
 * Scan the cell at (x, y): spends scan O₂ + ambient drain, reveals the heat toward the
 * nearest live deposit, and marks an exact-hit deposit found. Returns the new session and the
 * heat reading. No-op (heat "none") if the session has ended or O₂ can't cover the cost.
 */
export function scan(
  session: EvaSession,
  x: number,
  y: number,
): { session: EvaSession; heat: ScanHeat; injured: boolean } {
  const cfg = config.eva;
  const cost = cfg.scanCost + cfg.ambientDrainPerAction;
  if (session.ended || session.o2 < cost) {
    return { session, heat: "none", injured: false };
  }
  const o2 = session.o2 - cost;
  const dist = nearestLiveDistance(session, x, y);
  const heat = heatForDistance(dist);
  const deposits = session.deposits.map((d) =>
    d.x === x && d.y === y && d.remaining > 0 ? { ...d, found: true } : d,
  );
  const injured = rollInjuryAt({ ...session, o2 });
  const next: EvaSession = {
    ...session,
    o2,
    deposits,
    ended: o2 <= 0,
  };
  return { session: next, heat, injured };
}

/** Injury roll evaluated against a session whose O₂ has already been debited. */
function rollInjuryAt(session: EvaSession): boolean {
  return rollInjury(session);
}

/**
 * Drill the cell at (x, y): spends drill O₂ + ambient drain. If a live deposit sits there and
 * the carry cap isn't full, banks one drill's yield (water/parts/score + mass) and decrements
 * the deposit. Returns the new session, whether a deposit was hit, and whether an injury rolled.
 */
export function drill(
  session: EvaSession,
  x: number,
  y: number,
): { session: EvaSession; hit: boolean; injured: boolean } {
  const cfg = config.eva;
  const cost = cfg.drillCost + cfg.ambientDrainPerAction;
  if (session.ended || session.o2 < cost || isCarryFull(session)) {
    return { session, hit: false, injured: false };
  }
  const o2 = session.o2 - cost;

  const idx = session.deposits.findIndex((d) => d.x === x && d.y === y && d.remaining > 0);
  let haul = session.haul;
  let deposits = session.deposits;
  let hit = false;
  if (idx >= 0) {
    hit = true;
    const dep = session.deposits[idx];
    const type = depositType(dep.typeId);
    haul = {
      water: haul.water + (type.resource === "water" ? type.yield : 0),
      parts: haul.parts + (type.resource === "parts" ? type.yield : 0),
      score: haul.score + type.score,
      mass: haul.mass + type.mass,
      drills: haul.drills + 1,
    };
    deposits = session.deposits.map((d, i) =>
      i === idx ? { ...d, remaining: d.remaining - 1, found: true } : d,
    );
  }

  const injured = rollInjuryAt({ ...session, o2 });
  const next: EvaSession = {
    ...session,
    o2,
    haul,
    deposits,
    ended: o2 <= 0,
  };
  return { session: next, hit, injured };
}

/** Mark a crew member injured on the session (the controller picks a living member). */
export function applyInjury(session: EvaSession, crewId: string): EvaSession {
  return { ...session, injuredCrew: session.injuredCrew ?? crewId };
}

/** End the EVA (return to rover). Caller banks `session.haul` into resources. */
export function endEva(session: EvaSession): EvaSession {
  return { ...session, ended: true };
}
