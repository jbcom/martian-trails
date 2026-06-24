import { describe, expect, it } from "vitest";
import { allNpcs, getEncounterBank, getNpc, npcsAtLocation } from "@/content/encounters";
import type { EncounterBank } from "@/schemas/encounter";
import {
  type EncounterRunState,
  gotoNode,
  resolveEncounter,
  resolveEncounterSlot,
  slotMatches,
} from "@/sim/encounters";

const state = (over: Partial<EncounterRunState> = {}): EncounterRunState => ({
  sol: 1,
  flags: new Set(),
  lowResources: new Set(),
  ...over,
});

const BANK: EncounterBank = {
  id: "encbank:test",
  npc: "npc:test",
  slots: [
    { id: "named-only", node: "addressable" },
    { when: { resourceLow: "water" }, node: "low-water" },
    { when: { flagSet: "flag:seen" }, node: "seen" },
    { when: { minSol: 10 }, node: "late" },
    { default: true, node: "default" },
  ],
  nodes: {
    addressable: { lines: ["a"], choices: [], emits: "e:a" },
    "low-water": { lines: ["w"], choices: [], emits: "e:w" },
    seen: { lines: ["s"], choices: [], emits: "e:s" },
    late: { lines: ["l"], choices: [], emits: "e:l" },
    default: { lines: ["d"], choices: [], emits: "e:d" },
  },
};

describe("encounter resolver — slot precedence (pure)", () => {
  it("falls through to the default slot when nothing else matches", () => {
    expect(resolveEncounter(state(), BANK).nodeKey).toBe("default");
  });

  it("skips addressable-only (id) slots in state-driven resolution", () => {
    // The 'named-only' slot is first but has an id — it must never win a state-driven resolve.
    expect(resolveEncounter(state(), BANK).nodeKey).not.toBe("addressable");
  });

  it("matches the first slot whose `when` holds, top-down", () => {
    // resourceLow:water comes before flagSet:seen — with both true, low-water wins.
    const s = state({ lowResources: new Set(["water"]), flags: new Set(["flag:seen"]) });
    expect(resolveEncounter(s, BANK).nodeKey).toBe("low-water");
  });

  it("honors minSol (not before, yes after)", () => {
    expect(resolveEncounter(state({ sol: 9 }), BANK).nodeKey).toBe("default");
    expect(resolveEncounter(state({ sol: 10 }), BANK).nodeKey).toBe("late");
  });

  it("honors notFlag and flagSet independently", () => {
    expect(
      slotMatches(state({ flags: new Set(["flag:seen"]) }), {
        when: { flagSet: "flag:seen" },
        node: "x",
      }),
    ).toBe(true);
    expect(slotMatches(state(), { when: { flagSet: "flag:seen" }, node: "x" })).toBe(false);
    expect(
      slotMatches(state({ flags: new Set(["flag:x"]) }), {
        when: { notFlag: "flag:x" },
        node: "y",
      }),
    ).toBe(false);
    expect(slotMatches(state(), { when: { notFlag: "flag:x" }, node: "y" })).toBe(true);
  });

  it("resolves an addressable slot by name", () => {
    expect(resolveEncounterSlot(BANK, "named-only").nodeKey).toBe("addressable");
    expect(() => resolveEncounterSlot(BANK, "nope")).toThrow(/no slot named/);
  });

  it("throws when no slot matches and there is no default", () => {
    const noDefault: EncounterBank = { ...BANK, slots: [{ when: { minSol: 99 }, node: "late" }] };
    expect(() => resolveEncounter(state(), noDefault)).toThrow(/no slot matched/);
  });

  it("gotoNode follows a choice branch to another node", () => {
    expect(gotoNode(BANK, "seen").nodeKey).toBe("seen");
    expect(() => gotoNode(BANK, "missing")).toThrow(/missing node/);
  });

  it("is deterministic — same state resolves the same node every call", () => {
    const s = state({ sol: 12 });
    const a = resolveEncounter(s, BANK).nodeKey;
    const b = resolveEncounter(s, BANK).nodeKey;
    expect(a).toBe(b);
  });
});

describe("encounter content registry", () => {
  it("loads + validates the shipped NPCs and banks", () => {
    expect(allNpcs().length).toBeGreaterThan(0);
    const vasquez = getNpc("npc:depot-trader-vasquez");
    expect(vasquez?.archetype).toBe("trader");
    expect(vasquez?.locations).toContain("trail");
    expect(getEncounterBank(vasquez!.bank)).toBeDefined();
  });

  it("indexes depot NPCs by content location", () => {
    expect(npcsAtLocation("depot").map((npc) => npc.id)).toEqual([
      "npc:depot-quartermaster-okonkwo",
      "npc:depot-prospector-reyes",
    ]);
  });

  it("indexes all roadside encounter archetypes by trail location", () => {
    const trail = npcsAtLocation("trail");
    expect(trail.map((npc) => npc.archetype).sort()).toEqual([
      "rival",
      "scavenger",
      "stranded",
      "trader",
    ]);
    for (const npc of trail) expect(getEncounterBank(npc.bank)).toBeDefined();
  });

  it("resolves the trader's first-meeting by default and the hard-up node when water is low", () => {
    const bank = getEncounterBank("encbank:vasquez")!;
    expect(resolveEncounter(state(), bank).nodeKey).toBe("first-meeting");
    expect(resolveEncounter(state({ lowResources: new Set(["water"]) }), bank).nodeKey).toBe(
      "hard-up",
    );
  });

  it("shows the return greeting once the player has traded", () => {
    const bank = getEncounterBank("encbank:vasquez")!;
    expect(resolveEncounter(state({ flags: new Set(["flag:vasquez-traded"]) }), bank).nodeKey).toBe(
      "return-greeting",
    );
  });
});
