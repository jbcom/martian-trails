import { create } from "zustand";
import { DEFAULT_SPONSOR } from "@/content/sponsors";
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
  /** The chosen mission sponsor id (the Oregon Trail profession analog). */
  sponsorId: string;
  settings: Settings;

  goTo: (screen: Screen) => void;
  /** Title → sponsor select: seed the run and present the sponsor cards. */
  startRun: (seed: string) => void;
  /** Sponsor select → depot: lock in the sponsor (its budget seeds the depot). */
  chooseSponsor: (sponsorId: string) => void;
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
  sponsorId: DEFAULT_SPONSOR.id,
  settings: { ...DEFAULT_SETTINGS },

  goTo: (screen) => set({ screen }),
  // "Begin" now routes to the sponsor-select screen (the profession choice), not
  // straight to the depot — the chosen sponsor's budget seeds provisioning.
  startRun: (seed) => set({ seed, screen: "sponsor" }),
  chooseSponsor: (sponsorId) => set({ sponsorId, screen: "depot" }),
  setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
}));
