/**
 * Frame-cadence sim→render bridge. A plain mutable singleton the simulation
 * writes each fixed step and the R3F scene reads inside `useFrame`. This is
 * deliberately NOT the zustand store — writing 60×/s to a React store would tank
 * reactivity (see docs/ARCHITECTURE.md §2). No React, no sim/three imports here.
 */
export interface Diagnostics {
  /** Distance travelled (km) toward the 2500 km goal. */
  distance: number;
  /** Martian day count. */
  sol: number;
  /** Whether the rover is actively driving (for engine hum / wheel motion). */
  driving: boolean;
  /** Normalized day phase 0..1 (for sky lerp / sun position). */
  dayCycle: number;
  /** Active weather tag (drives storm VFX). */
  weather: "clear" | "dust_storm";
  /** Normalized vitals 0..1 for HUD-less render cues (e.g. alarm vignette). */
  hull: number;
  power: number;
  /** True when any vital is critical (drives the alarm overlay). */
  critical: boolean;
  /**
   * Impulse trauma 0..1 for a camera-shake on impactful beats (hazard-fail, hull-critical).
   * The sim/UI BUMPS this toward 1 on a beat; the render scene reads it in useFrame and decays
   * it back to 0. Render-only — never feeds back into the pure sim.
   */
  shake: number;
  /** Active encounter NPC position for the render layer (null when none). */
  encounter: { active: boolean; npcId: string; x: number; y: number; z: number } | null;
}

const diagnostics: Diagnostics = {
  distance: 0,
  sol: 1,
  driving: false,
  dayCycle: 0,
  weather: "clear",
  hull: 1,
  power: 1,
  critical: false,
  shake: 0,
  encounter: null,
};

/** The shared diagnostics object. Mutate in place; never replace the reference. */
export function getDiagnostics(): Diagnostics {
  return diagnostics;
}

/**
 * Kick the camera-shake trauma. Takes the MAX so a fresh beat never weakens an in-flight
 * shake. `amount` is clamped to 0..1 (1 = the hardest knock). Render decays it each frame.
 */
export function bumpShake(amount: number): void {
  diagnostics.shake = Math.min(1, Math.max(diagnostics.shake, amount));
}

/** Reset to defaults at the start of a run. */
export function resetDiagnostics(): void {
  diagnostics.distance = 0;
  diagnostics.sol = 1;
  diagnostics.driving = false;
  diagnostics.dayCycle = 0;
  diagnostics.weather = "clear";
  diagnostics.hull = 1;
  diagnostics.power = 1;
  diagnostics.critical = false;
  diagnostics.shake = 0;
  diagnostics.encounter = null;
}
