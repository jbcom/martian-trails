import { describe, expect, it } from "vitest";
import { allEvents } from "@/content/events";
import { createRng } from "@/core/rng";
import { type EventDirectorState, pickDirectedEvent, scoreTrailEvent } from "@/sim/eventDirector";

const calmState: EventDirectorState = {
  sol: 8,
  daysSinceEvent: 1,
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

describe("event director — M8-6 scored pacing", () => {
  it("raises supply-cache desirability when vitals are thin", () => {
    const event = allEvents().find((item) => item.tags.includes("supply-cache"));
    expect(event).toBeDefined();

    const stressed: EventDirectorState = {
      ...calmState,
      lowResources: new Set(["oxygen", "water", "rations"]),
      resourceRatios: { ...calmState.resourceRatios, oxygen: 0.08, water: 0.12, rations: 0.16 },
    };

    expect(scoreTrailEvent(event!, stressed)).toBeGreaterThan(scoreTrailEvent(event!, calmState));
  });

  it("raises mechanical-failure desirability when hull and parts are poor", () => {
    const event = allEvents().find((item) => item.tags.includes("mechanical-failure"));
    expect(event).toBeDefined();

    const brittle: EventDirectorState = {
      ...calmState,
      lowResources: new Set(["hull", "parts"]),
      resourceRatios: { ...calmState.resourceRatios, hull: 0.18, parts: 0.1 },
    };

    expect(scoreTrailEvent(event!, brittle)).toBeGreaterThan(scoreTrailEvent(event!, calmState));
  });

  it("is deterministic for the same seed and state", () => {
    const events = allEvents();
    const a = pickDirectedEvent(events, calmState, createRng("director:stable"));
    const b = pickDirectedEvent(events, calmState, createRng("director:stable"));

    expect(a?.id).toBe(b?.id);
  });
});
