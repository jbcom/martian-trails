import type {
  EncounterBank,
  EncounterNode,
  EncounterSlot,
  EncounterWhen,
} from "@/schemas/encounter";

/**
 * Encounter slot resolution (M8) — ported from a-good-old-fashioned-adventure's dialogue.ts.
 * PURE and deterministic: this never mutates state, never touches three/react/DOM, never rolls
 * randomness. It only decides WHICH node an NPC shows given the current run-state. Consequence
 * (effects/flags) is applied by the run controller from the chosen node, not here.
 *
 * Slot precedence: top-down, first match wins; `default:true` is the fallback; slots with an `id`
 * are addressable-only (skipped in state-driven resolution, reachable by name).
 */

/** The minimal run-state view a slot's `when` is evaluated against (kept tiny + serialisable). */
export interface EncounterRunState {
  /** Current Sol (1-based). */
  sol: number;
  /** Run flags currently set. */
  flags: ReadonlySet<string>;
  /** Resource pools currently below their low-water threshold (e.g. {"oxygen"}). */
  lowResources: ReadonlySet<string>;
}

/** Does this slot's `when` hold for the current run-state? `default` always matches. */
export function slotMatches(state: EncounterRunState, slot: EncounterSlot): boolean {
  if (slot.default) return true;
  const when = slot.when;
  if (!when) return false;
  return whenHolds(state, when);
}

function whenHolds(state: EncounterRunState, when: EncounterWhen): boolean {
  if (when.flagSet && !state.flags.has(when.flagSet)) return false;
  if (when.notFlag && state.flags.has(when.notFlag)) return false;
  if (when.minSol !== undefined && state.sol < when.minSol) return false;
  if (when.resourceLow && !state.lowResources.has(when.resourceLow)) return false;
  return true;
}

/** A resolved bank node, ready to present. */
export interface ResolvedEncounter {
  bankId: string;
  nodeKey: string;
  node: EncounterNode;
}

function nodeOrThrow(bank: EncounterBank, key: string): EncounterNode {
  const node = bank.nodes[key];
  if (!node) throw new Error(`${bank.id}: slot points at missing node "${key}"`);
  return node;
}

/**
 * State-driven resolution — pick the first non-addressable slot whose `when` matches. Throws if
 * none match (author a `default` slot). Mirrors agofa's resolveDialogue.
 */
export function resolveEncounter(state: EncounterRunState, bank: EncounterBank): ResolvedEncounter {
  for (const slot of bank.slots) {
    if (slot.id) continue; // addressable-only
    if (slotMatches(state, slot)) {
      return { bankId: bank.id, nodeKey: slot.node, node: nodeOrThrow(bank, slot.node) };
    }
  }
  throw new Error(`${bank.id}: no slot matched (add a default slot)`);
}

/** Direct resolution by slot name (a specific addressable beat). Mirrors agofa's resolveDialogueSlot. */
export function resolveEncounterSlot(bank: EncounterBank, slotId: string): ResolvedEncounter {
  const slot = bank.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`${bank.id}: no slot named "${slotId}"`);
  return { bankId: bank.id, nodeKey: slot.node, node: nodeOrThrow(bank, slot.node) };
}

/** Follow a choice's `goto` to the next node in the same bank (branching). */
export function gotoNode(bank: EncounterBank, nodeKey: string): ResolvedEncounter {
  return { bankId: bank.id, nodeKey, node: nodeOrThrow(bank, nodeKey) };
}
