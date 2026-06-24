/**
 * Typed config loader. Each per-domain JSON in this directory is parsed against its zod
 * schema at module load — a malformed or out-of-range balance number is a hard error here,
 * never a silent gameplay bug downstream. The sim imports the parsed, typed exports only.
 *
 * "Tunables as DATA; code interprets content, never embeds it" (docs/ARCHITECTURE.md).
 */

import { z } from "zod";
import { type AbilitiesConfig, abilitiesFileSchema } from "@/schemas/ability";
import {
  type CrewConfig,
  crewSchema,
  type ResourcesConfig,
  resourcesSchema,
  type ScoringConfig,
  type StoreConfig,
  scoringSchema,
  storeSchema,
  type TerrainConfig,
  type TravelConfig,
  terrainSchema,
  travelSchema,
  type UpgradesConfig,
  upgradesSchema,
} from "@/schemas/config";
import { type EvaConfig, evaSchema } from "@/schemas/eva";
import { type HazardsConfig, hazardsFileSchema } from "@/schemas/hazard";
import { type IllnessConfig, illnessSchema } from "@/schemas/illness";
import { type OutpostsConfig, outpostsFileSchema } from "@/schemas/outpost";
import abilitiesJson from "./abilities.json";
import crewJson from "./crew.json";
import evaJson from "./eva.json";
import hazardsJson from "./hazards.json";
import illnessJson from "./illness.json";
import outpostsJson from "./outposts.json";
import resourcesJson from "./resources.json";
import scoringJson from "./scoring.json";
import storeJson from "./store.json";
import terrainJson from "./terrain.json";
import travelJson from "./travel.json";
import upgradesJson from "./upgrades.json";

/** Parse `data` against `schema`, throwing a labeled error on failure (fail-fast). */
function load<T>(label: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`config/${label}.json failed validation:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const resources: ResourcesConfig = load("resources", resourcesSchema, resourcesJson);
export const travel: TravelConfig = load("travel", travelSchema, travelJson);
export const crew: CrewConfig = load("crew", crewSchema, crewJson);
export const terrain: TerrainConfig = load("terrain", terrainSchema, terrainJson);
export const upgrades: UpgradesConfig = load("upgrades", upgradesSchema, upgradesJson);
export const store: StoreConfig = load("store", storeSchema, storeJson);
export const scoring: ScoringConfig = load("scoring", scoringSchema, scoringJson);
export const illness: IllnessConfig = load("illness", illnessSchema, illnessJson);
export const hazards: HazardsConfig = load("hazards", hazardsFileSchema, hazardsJson);
export const eva: EvaConfig = load("eva", evaSchema, evaJson);
export const outposts: OutpostsConfig = load("outposts", outpostsFileSchema, outpostsJson);
export const abilities: AbilitiesConfig = load("abilities", abilitiesFileSchema, abilitiesJson);

/** The complete validated config bundle, handy for factories and tests. */
export const config = {
  resources,
  travel,
  crew,
  terrain,
  upgrades,
  store,
  scoring,
  illness,
  hazards,
  eva,
  outposts,
  abilities,
} as const;

export type Config = typeof config;
