import { useGLTF } from "@react-three/drei";

/**
 * Curated PSX GLB model URLs. Built from Vite's BASE_URL so the same bundle
 * resolves correctly under GitHub Pages (/martian-trails/), Capacitor (file://,
 * relative), and the local dev server (/). The files are produced by the
 * FBX->GLB curation pipeline (scripts/curate-assets.mjs) and integrity-gated by
 * tests/unit/asset-manifest.test.ts.
 */
const base = import.meta.env.BASE_URL;

export const MODELS = {
  /** PSX Bus, kitbashed into the pressurized rover (the "wagon"). */
  rover: `${base}assets/models/rover/rover.glb`,
  /** PSX Astronaut — hero EVA actor + crew. */
  astronaut: `${base}assets/models/crew/astronaut.glb`,
  /** PSX rocky cliff face — the hazard-traverse terrain feature + EVA deposit rocks. */
  rocks: `${base}assets/models/terrain/rocks.glb`,
  /** PSX-Electrical machinery — outpost generator / habitat prop. */
  machinery1: `${base}assets/models/outpost/machinery_1.glb`,
  machinery3: `${base}assets/models/outpost/machinery_3.glb`,
  /** PSX-Electrical pipe + valve — depot plumbing dressing. */
  pipe: `${base}assets/models/props/pipe_straight.glb`,
  valve: `${base}assets/models/props/valve.glb`,
} as const;

export type ModelKey = keyof typeof MODELS;

/** Preload every curated model so screens swap without a load hitch. */
export function preloadModels(): void {
  for (const url of Object.values(MODELS)) {
    useGLTF.preload(url);
  }
}
