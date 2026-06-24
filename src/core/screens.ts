/**
 * The screen router's single source of truth. The const tuple is authoritative so
 * the runtime list and the type can never drift. Each screen is its own React
 * component + R3F scene (see docs/ARCHITECTURE.md §3) — NOT one update() gated by
 * an enum. This is the structural fix for the POC's depot-renders-black regression.
 */
export const SCREENS = [
  "boot",
  "sponsor",
  "depot",
  "travel",
  "hazard",
  "eva",
  "outpost",
  "event",
  "encounter",
  "terminus",
  "gameover",
] as const;

export type Screen = (typeof SCREENS)[number];

export function isScreen(value: string): value is Screen {
  return (SCREENS as readonly string[]).includes(value);
}
