import { config } from "@/config";
import { getEncounterBank, getNpc, npcsAtLocation } from "@/content/encounters";
import type { EncounterRunState, ResolvedEncounter } from "@/sim/encounters";
import { resolveEncounter } from "@/sim/encounters";
import type { DepotState } from "@/sim/loadout";

const DEPOT_SOCIAL_LOCATION = "depot";
const LOW_VITAL_SOLS = 4;

/**
 * Depot social hub helpers (m8-2). Pure TS: content chooses the launch-depot cast, and
 * this resolver turns the current cart + social flags into an encounter bank node.
 */

/** The Martians physically present at Underhill before departure. */
export function depotSocialNpcs() {
  return npcsAtLocation(DEPOT_SOCIAL_LOCATION);
}

/** Build the tiny run-state view needed by encounter bank slot resolution before a run exists. */
export function depotEncounterState(
  cart: DepotState,
  flags: ReadonlySet<string> = new Set(),
): EncounterRunState {
  const crew = config.crew.roster.length;
  const drain = config.resources.drainPerCrew;
  const lowResources = new Set<string>();
  const thresholds: Record<string, number> = {
    oxygen: drain.oxygen * crew * LOW_VITAL_SOLS,
    water: drain.water * crew * LOW_VITAL_SOLS,
    rations: drain.rations * crew * LOW_VITAL_SOLS,
  };

  for (const [resource, threshold] of Object.entries(thresholds)) {
    if ((cart[resource] ?? 0) < threshold) lowResources.add(resource);
  }

  return { sol: 1, flags, lowResources };
}

/** Resolve one depot NPC's current conversation node. Throws on malformed content references. */
export function resolveDepotEncounter(
  npcId: string,
  cart: DepotState,
  flags: ReadonlySet<string> = new Set(),
): ResolvedEncounter {
  const npc = getNpc(npcId);
  if (!npc) throw new Error(`Unknown depot NPC "${npcId}"`);
  if (!npc.locations.includes(DEPOT_SOCIAL_LOCATION)) {
    throw new Error(`${npc.id} is not present at the launch depot`);
  }
  const bank = getEncounterBank(npc.bank);
  if (!bank) throw new Error(`${npc.id}: missing encounter bank "${npc.bank}"`);
  return resolveEncounter(depotEncounterState(cart, flags), bank);
}
