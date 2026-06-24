import { create } from "zustand";
import type { Screen } from "@/core/screens";

/**
 * UI-cadence store (human cadence). Holds the current screen, settings, and the
 * run summary the UI reads through. Per-frame simulation data does NOT live here
 * — that flows via the frame-cadence diagnostics bridge (see state/diagnostics.ts
 * and docs/ARCHITECTURE.md §2); 60×/s writes here would tank React.
 */
export interface Settings {
  muted: boolean;
  reducedMotion: boolean;
  haptics: boolean;
}

export interface GameStore {
  screen: Screen;
  /** The run seed (drives the deterministic sim). */
  seed: string | null;
  settings: Settings;

  goTo: (screen: Screen) => void;
  startRun: (seed: string) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  reducedMotion: false,
  haptics: true,
};

export const useGameStore = create<GameStore>((set) => ({
  screen: "boot",
  seed: null,
  settings: { ...DEFAULT_SETTINGS },

  goTo: (screen) => set({ screen }),
  startRun: (seed) => set({ seed, screen: "sponsor" }),
  setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
}));
