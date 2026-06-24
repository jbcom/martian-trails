import { describe, expect, it } from "vitest";
import { depotSocialNpcs, resolveDepotEncounter } from "@/sim/depotSocial";
import { initialDepot } from "@/sim/loadout";
import { run } from "@/sim/run";

const LOADOUT = {
  oxygen: 600,
  water: 600,
  rations: 600,
  parts: 40,
  medkits: 2,
  rtg: 2,
  upgrades: [] as string[],
};

describe("depot social hub", () => {
  it("surfaces the launch-depot Martian cast from encounter content", () => {
    const names = depotSocialNpcs().map((npc) => npc.name);
    expect(names).toEqual(["Okonkwo", "Reyes"]);
  });

  it("resolves Okonkwo's briefing by default and after-briefing once flagged", () => {
    const cart = initialDepot();
    expect(resolveDepotEncounter("npc:depot-quartermaster-okonkwo", cart).nodeKey).toBe("briefing");
    expect(
      resolveDepotEncounter(
        "npc:depot-quartermaster-okonkwo",
        cart,
        new Set(["flag:okonkwo-briefed"]),
      ).nodeKey,
    ).toBe("after-briefing");
  });

  it("rejects trail-only NPCs as launch-depot contacts", () => {
    expect(() => resolveDepotEncounter("npc:depot-trader-vasquez", initialDepot())).toThrow(
      /not present/,
    );
  });

  it("seeds depot social flags into the run controller for later encounter resolution", () => {
    run.start("depot-flags", LOADOUT);
    run.addEncounterFlags(["flag:okonkwo-briefed", "flag:reyes-tipped"]);
    expect(run.snapshot()?.encounterFlags).toEqual(["flag:okonkwo-briefed", "flag:reyes-tipped"]);
  });
});
