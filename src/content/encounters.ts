import banksJson from "@/content/encounters/banks.json";
import npcsJson from "@/content/encounters/npcs.json";
import {
  type EncounterBank,
  encounterBanksFileSchema,
  type MartianNpc,
  martianNpcsFileSchema,
} from "@/schemas/encounter";

/**
 * Encounter content registry (M8) — the Martian NPCs and their conversation banks, validated at
 * module load (a malformed bank fails fast, never reaches the sim). "Code interprets content,
 * never embeds it" — the encounters themselves are data.
 */
const npcs: MartianNpc[] = martianNpcsFileSchema.parse(npcsJson);
const banks: EncounterBank[] = encounterBanksFileSchema.parse(banksJson);

const npcById = new Map(npcs.map((n) => [n.id, n]));
const bankById = new Map(banks.map((b) => [b.id, b]));

// Fail fast on dangling references: every NPC's bank and every bank's npc must exist.
for (const npc of npcs) {
  if (!bankById.has(npc.bank)) throw new Error(`${npc.id}: references missing bank "${npc.bank}"`);
}
for (const bank of banks) {
  if (!npcById.has(bank.npc)) throw new Error(`${bank.id}: references missing npc "${bank.npc}"`);
}

/** All Martian NPCs. */
export function allNpcs(): readonly MartianNpc[] {
  return npcs;
}

/** Look up an NPC by id. */
export function getNpc(id: string): MartianNpc | undefined {
  return npcById.get(id);
}

/** Look up an encounter bank by id. */
export function getEncounterBank(id: string): EncounterBank | undefined {
  return bankById.get(id);
}

/** NPCs of a given archetype (e.g. all traders). */
export function npcsByArchetype(archetype: MartianNpc["archetype"]): MartianNpc[] {
  return npcs.filter((n) => n.archetype === archetype);
}
