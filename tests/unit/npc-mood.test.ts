import { describe, expect, it } from "vitest";
import { getNpc, npcsAtLocation } from "@/content/encounters";
import { createRng } from "@/core/rng";
import {
  moodForRunState,
  type NpcMoodState,
  pickMoodedNpc,
  scoreNpcEncounter,
} from "@/sim/npcMood";

const calmState: NpcMoodState = {
  sol: 6,
  lowResources: new Set(),
  resourceRatios: {
    oxygen: 1,
    water: 1,
    rations: 1,
    power: 1,
    morale: 1,
    hull: 1,
    parts: 1,
    medkits: 1,
  },
};

describe("NPC mood — M8-7 fuzzy roadside arbitration", () => {
  it("keeps fuzzy mood variables bounded", () => {
    const mood = moodForRunState({
      ...calmState,
      lowResources: new Set(["oxygen", "water", "rations", "hull", "morale"]),
      resourceRatios: {
        ...calmState.resourceRatios,
        oxygen: 0,
        water: 0.05,
        rations: 0.1,
        hull: 0.08,
        morale: 0.12,
      },
    });

    expect(mood.greed).toBeGreaterThanOrEqual(0);
    expect(mood.greed).toBeLessThanOrEqual(1);
    expect(mood.desperation).toBeGreaterThanOrEqual(0);
    expect(mood.desperation).toBeLessThanOrEqual(1);
    expect(mood.aggression).toBeGreaterThanOrEqual(0);
    expect(mood.aggression).toBeLessThanOrEqual(1);
  });

  it("makes stranded encounters more desirable when vitals are scarce", () => {
    const stranded = getNpc("npc:stranded-hauler-rourke");
    expect(stranded).toBeDefined();

    const stressed: NpcMoodState = {
      ...calmState,
      lowResources: new Set(["oxygen", "water", "rations"]),
      resourceRatios: { ...calmState.resourceRatios, oxygen: 0.1, water: 0.12, rations: 0.14 },
    };

    expect(scoreNpcEncounter(stranded!, stressed)).toBeGreaterThan(
      scoreNpcEncounter(stranded!, calmState),
    );
  });

  it("makes scavengers more desirable when hull and morale are brittle", () => {
    const scavenger = getNpc("npc:scavenger-marrow");
    expect(scavenger).toBeDefined();

    const vulnerable: NpcMoodState = {
      ...calmState,
      lowResources: new Set(["hull", "morale", "parts"]),
      resourceRatios: { ...calmState.resourceRatios, hull: 0.1, morale: 0.18, parts: 0.08 },
    };

    expect(scoreNpcEncounter(scavenger!, vulnerable)).toBeGreaterThan(
      scoreNpcEncounter(scavenger!, calmState),
    );
  });

  it("is deterministic for the same seed and state", () => {
    const npcs = npcsAtLocation("trail");
    const a = pickMoodedNpc(npcs, calmState, createRng("npc-mood:stable"));
    const b = pickMoodedNpc(npcs, calmState, createRng("npc-mood:stable"));

    expect(a?.id).toBe(b?.id);
  });
});
