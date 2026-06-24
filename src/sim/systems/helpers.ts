/**
 * Shared read helpers for the systems. Keeps crew-trait lookups and the "is X alive"
 * predicate in one place so every system applies the same canonical modifiers.
 */
import { config } from "@/config";
import type { CrewMemberConfig } from "@/schemas/config";
import type { CrewState } from "../traits";

/** Immutable trait config for a crew id, or undefined if unknown. */
export function crewTraits(id: string): CrewMemberConfig["traits"] | undefined {
  return config.crew.roster.find((m) => m.id === id)?.traits;
}

/** Whether the named crew member is currently alive (POC `isAlive`). */
export function isAlive(crew: readonly CrewState[], id: string): boolean {
  return crew.some((c) => c.id === id && c.alive);
}

/** Living crew count (POC `state.crew.filter(c=>c.alive).length`). */
export function aliveCount(crew: readonly CrewState[]): number {
  return crew.reduce((n, c) => n + (c.alive ? 1 : 0), 0);
}

/** Clamp a value to [0, max]. */
export function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}
