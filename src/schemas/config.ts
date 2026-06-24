/**
 * Zod schemas for the per-domain config tunables (src/config/*.json). The loader
 * (src/config/index.ts) fail-fast validates each JSON against the matching schema on
 * import, so a typo in a balance number is a load-time error, not a silent gameplay bug.
 *
 * These schemas are the contract; the JSON is the data; the sim reads only the parsed,
 * typed result. "Code interprets content, never embeds it" (docs/ARCHITECTURE.md).
 */
import { z } from "zod";

const positive = z.number().positive();
const nonNegative = z.number().min(0);
const multiplier = z.number().min(0);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb hex color");

/** resources.json — pool maxima + per-Sol baseline drain rates. */
export const resourcesSchema = z.object({
  /** Per-pool maxima. Power max is derived from RTG count at spawn; this is the per-cell value. */
  max: z.object({
    oxygen: positive,
    water: positive,
    rations: positive,
    power: positive,
    morale: positive,
    hull: positive,
  }),
  /** Per-Sol drain applied once per living crew member (the POC CONSTANTS.DRAIN). */
  drainPerCrew: z.object({
    oxygen: nonNegative,
    water: nonNegative,
    rations: nonNegative,
    morale: nonNegative,
  }),
  /** Each RTG cell adds this much to the max power pool (POC MAX_POWER_PER_RTG). */
  maxPowerPerRtg: positive,
});
export type ResourcesConfig = z.infer<typeof resourcesSchema>;

/** travel.json — distance, pace, recharge, power-drain, hull, cold. */
export const travelSchema = z.object({
  /** Finish line in km (POC TOTAL_DISTANCE). */
  totalDistance: positive,
  /** Base km/Sol before pace + terrain multipliers (POC BASE_SPEED). */
  baseSpeed: positive,
  /** Base power drained per Sol of driving before pace²/terrain (POC POWER_DRAIN_DRIVING). */
  powerDrainDriving: positive,
  /** Per-Sol power recharge on a clear Sol / during a storm (POC recharge 25 / 2). */
  recharge: z.object({ clear: nonNegative, storm: nonNegative }),
  /** Pace presets: speed multiplier; power & hull scale with speedMult² (POC pace²). */
  pace: z.record(
    z.string(),
    z.object({
      speedMult: positive,
      /** Per-Sol event-trigger chance at this pace while driving (POC evChance ramp). */
      eventChance: z.number().min(0).max(1),
      /** Extra morale drop per Sol while driving above steady (POC (pace-1)*8 style). */
      moraleDrainBonus: nonNegative,
    }),
  ),
  /** Ration presets: rations-consumption multiplier + morale tradeoff. */
  rations: z.record(
    z.string(),
    z.object({
      consumptionMult: positive,
      /** Morale penalty per Sol when below full rations (POC (1-level)*15 style). */
      moralePenalty: nonNegative,
    }),
  ),
  /** Power-drain multiplier applied while hull is below the fraction (POC hull<30 → ×1.5). */
  lowHull: z.object({ threshold: positive, powerMult: positive }),
  /** Cold drain: below `onsetTemp` add |temp-onsetTemp| * coefficient to power drain/Sol. */
  cold: z.object({ onsetTemp: z.number(), coefficient: positive, baseTemp: z.number() }),
  /** Morale spikes when a vital hits zero (POC water≤0 → +15, rations≤0 → +10). */
  starvation: z.object({ waterZero: nonNegative, rationsZero: nonNegative }),
  /** Per-Sol chance (while driving) of a diegetic NPC encounter on the trail (M8). */
  encounterChance: z.number().min(0).max(1).default(0.15),
});
export type TravelConfig = z.infer<typeof travelSchema>;

/**
 * weather.json — the dust-storm state machine (the POC's storm the scaffold never wired).
 * A clear Sol can KICK UP a storm; an active storm can BLOW OVER — both as per-Sol seeded
 * rolls past a minimum distance. The storm drives the power cold-snap + reduced recharge
 * (src/sim/systems/power.ts) and the render dust overlay (via the diagnostics bridge).
 */
export const weatherSchema = z.object({
  /** Distance below which the weather never changes (parallels terrain.zoneChangeMinDistance). */
  onsetMinDistance: nonNegative,
  /** Per-Sol chance a clear Sol turns into a dust storm. */
  stormChance: z.number().min(0).max(1),
  /** Per-Sol chance an active dust storm blows over and clears. */
  clearChance: z.number().min(0).max(1),
});
export type WeatherConfig = z.infer<typeof weatherSchema>;

/** crew.json — the four named colonists + their passive trait modifiers. */
export const crewMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  traits: z.object({
    /** Multiplier on this member's contribution to water + rations drain (nadia 0.8). */
    consumptionMult: multiplier,
    /** Morale-drain multiplier the crew enjoys while this member is alive (john 0.5). */
    moraleDrainMult: multiplier,
    /** Chance to NOT consume a part on repair while alive (maya 0.3). */
    partSaveChance: z.number().min(0).max(1),
    /** Flat bonus hull % per repair while alive (maya +15). */
    hullRepairBonus: nonNegative,
    /** EVA / geological yield multiplier while alive (frank 2). */
    evaYieldMult: positive,
  }),
});
export const crewSchema = z.object({
  roster: z.array(crewMemberSchema).min(1),
});
export type CrewMemberConfig = z.infer<typeof crewMemberSchema>;
export type CrewConfig = z.infer<typeof crewSchema>;

/** terrain.json — the drivable zones + the outpost waypoints. */
export const terrainZoneSchema = z.object({
  name: z.string().min(1),
  speed: positive,
  power: positive,
  hullDamage: nonNegative,
  color: hexColor,
});
export const terrainSchema = z.object({
  zones: z.array(terrainZoneSchema).min(1),
  outposts: z.array(z.object({ name: z.string().min(1), distance: positive })).min(1),
  /** Distance below which the zone never changes (POC distance>100 gate). */
  zoneChangeMinDistance: nonNegative,
});
export type TerrainZoneConfig = z.infer<typeof terrainZoneSchema>;
export type TerrainConfig = z.infer<typeof terrainSchema>;

/** upgrades.json — rover sub-system upgrades. */
export const upgradeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  desc: z.string().min(1),
  /** Cost in machined Parts to install at an outpost (the field-install price). */
  cost: positive,
  /** Cost in Credits to factory-fit at the depot before launch. */
  creditCost: positive,
});
export const upgradesSchema = z.object({
  catalog: z.array(upgradeSchema).min(1),
  /** Effect coefficients keyed by upgrade id, read by the systems. */
  effects: z.object({
    /** Oxygen-drain multiplier when scrubbers installed (POC 0.75). */
    scrubbersOxygenMult: positive,
    /** Terrain hull-damage multiplier when suspension installed (POC 0.7). */
    suspensionDamageMult: positive,
    /** Per-Sol event-chance multiplier when suspension installed (POC 0.5). */
    suspensionEventMult: positive,
    /** Recharge multiplier on clear Sols when solar installed (POC 1.4). */
    solarRechargeMult: positive,
    /** Cold-drain multiplier when aerogel insulation installed (POC thermal 0.5). */
    aerogelColdMult: positive,
    /** Rations produced per Sol when microHydroponics installed. */
    hydroponicsRationsPerSol: nonNegative,
  }),
});
export type UpgradeConfig = z.infer<typeof upgradeSchema>;
export type UpgradesConfig = z.infer<typeof upgradesSchema>;

/** store.json — the Underhill depot provisioning catalog. */
export const storeItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: positive,
  step: positive,
  max: positive,
  isBulk: z.boolean(),
  startQty: nonNegative,
});
export const storeSchema = z.object({
  budget: positive,
  /** Bulk payload cap in kg shared by isBulk items (POC MAX_CARGO). */
  payloadCap: positive,
  items: z.array(storeItemSchema).min(1),
});
export type StoreItemConfig = z.infer<typeof storeItemSchema>;
export type StoreConfig = z.infer<typeof storeSchema>;

/** scoring.json — the terminus rating formula coefficients. */
export const scoringSchema = z.object({
  base: nonNegative,
  perSurvivor: nonNegative,
  /** Divisor on summed surviving vitals (POC /5). */
  resourceDivisor: positive,
  /** Penalty per elapsed Sol (POC *15). */
  perSol: nonNegative,
  /** Score floor (POC Math.max(0, ...)). */
  floor: z.number(),
});
export type ScoringConfig = z.infer<typeof scoringSchema>;
