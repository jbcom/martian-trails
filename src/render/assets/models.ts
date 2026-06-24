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
  /** PSX Mega Pack modular base kit — enclosed depot/outpost/terminus interiors. */
  baseDoorwayWide: `${base}assets/models/base/doorway_hr_1_wide.glb`,
  baseElectrical1: `${base}assets/models/base/electrical_equipment_1.glb`,
  baseElectrical2: `${base}assets/models/base/electrical_equipment_2.glb`,
  baseFloor1: `${base}assets/models/base/floor_ceiling_hr_1.glb`,
  baseFloor5: `${base}assets/models/base/floor_ceiling_hr_5.glb`,
  baseGarageFrame: `${base}assets/models/base/garage_door_frame_hr_1.glb`,
  baseLamp: `${base}assets/models/base/lamp_mx_1_a_on.glb`,
  baseMetalBarrel: `${base}assets/models/base/metal_barrel_hr_1.glb`,
  basePlatformHandrail: `${base}assets/models/base/platform_b_handrail_1.glb`,
  basePlatformLarge: `${base}assets/models/base/platform_large_mx_1.glb`,
  baseRampWide: `${base}assets/models/base/ramp_platform_wide_mx_1.glb`,
  baseRoofMiddleAngle: `${base}assets/models/base/roof_hr_3_middle_angle.glb`,
  baseRoofSideAngle: `${base}assets/models/base/roof_hr_3_side_1_angle.glb`,
  baseShelf: `${base}assets/models/base/shelf_mx_1.glb`,
  baseStorageTank: `${base}assets/models/base/storage_tank_mx_1.glb`,
  baseTankSystem: `${base}assets/models/base/tank_system_mx_1.glb`,
  baseTestMachine: `${base}assets/models/base/test_machine_mx_1.glb`,
  baseWallDouble: `${base}assets/models/base/wall_hr_1_double.glb`,
  baseWallHole: `${base}assets/models/base/wall_hr_1_hole_2.glb`,
  baseWallTop: `${base}assets/models/base/wall_top_part_hr_1.glb`,
  baseWoodenCrate: `${base}assets/models/base/wooden_crate_2_a.glb`,
} as const;

export type ModelKey = keyof typeof MODELS;

/** Preload every curated model so screens swap without a load hitch. */
export function preloadModels(): void {
  for (const url of Object.values(MODELS)) {
    useGLTF.preload(url);
  }
}
