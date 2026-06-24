import { describe, expect, it } from "vitest";
import { config } from "@/config";
import { illnessSystem } from "@/sim/systems/illness";
import { Crew, Resources } from "@/sim/traits";
import { makeExpedition } from "./_util";

function afflict(e: ReturnType<typeof makeExpedition>["e"], id: string, condition: string) {
  const crew = e.get(Crew)!;
  const m = crew.find((c) => c.id === id)!;
  m.condition = condition;
  m.severity = 0;
  e.set(Crew, crew);
}

describe("illnessSystem", () => {
  it("leaves healthy crew untouched", () => {
    const { e } = makeExpedition("ill");
    e.set(Resources, { morale: 100 });
    illnessSystem(e);
    expect(e.get(Crew)!.every((c) => c.alive && c.condition === "healthy")).toBe(true);
    expect(e.get(Resources)!.morale).toBe(100);
  });

  it("progresses severity of an afflicted survivor", () => {
    // Sweep seeds for one where the member survives, then check severity climbed.
    const cond = config.illness.conditions.find((c) => c.id === "regolithLung")!;
    let found = false;
    for (let i = 0; i < 50 && !found; i++) {
      const { e } = makeExpedition(`prog-${i}`);
      e.set(Resources, { morale: 100 });
      afflict(e, "maya", "regolithLung");
      illnessSystem(e);
      const m = e.get(Crew)!.find((c) => c.id === "maya")!;
      if (m.alive) {
        expect(m.severity).toBeCloseTo(cond.progressionPerSol, 5);
        // survivor cost the crew the per-Sol morale penalty.
        expect(e.get(Resources)!.morale).toBeCloseTo(100 - cond.moralePenaltyPerSol, 5);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("a death roll kills the member and docks morale by the on-death penalty", () => {
    const cond = config.illness.conditions.find((c) => c.id === "radiationSickness")!;
    let found = false;
    for (let i = 0; i < 50 && !found; i++) {
      const { e } = makeExpedition(`death-${i}`);
      e.set(Resources, { morale: 100 });
      afflict(e, "frank", "radiationSickness");
      illnessSystem(e);
      const m = e.get(Crew)!.find((c) => c.id === "frank")!;
      if (!m.alive) {
        expect(e.get(Resources)!.morale).toBeCloseTo(100 - cond.moralePenaltyOnDeath, 5);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("is deterministic — same seed and state produce the same survival outcome", () => {
    const run = () => {
      const { e } = makeExpedition("ill-fixed");
      e.set(Resources, { morale: 100 });
      afflict(e, "maya", "injury");
      afflict(e, "frank", "hypothermia");
      illnessSystem(e);
      return e
        .get(Crew)!
        .map((c) => `${c.id}:${c.alive}:${c.severity}`)
        .join(",");
    };
    expect(run()).toEqual(run());
  });

  it("low-morale roll can kill a living crew at morale<=10", () => {
    // With all crew healthy and morale low, only the low-morale roll can fire.
    let killed = false;
    for (let i = 0; i < 80 && !killed; i++) {
      const { e } = makeExpedition(`lowm-${i}`);
      e.set(Resources, { morale: 5 });
      illnessSystem(e);
      if (e.get(Crew)!.some((c) => !c.alive)) killed = true;
    }
    expect(killed).toBe(true);
  });

  it("does NOT fire the low-morale roll above the threshold", () => {
    for (let i = 0; i < 30; i++) {
      const { e } = makeExpedition(`safe-${i}`);
      e.set(Resources, { morale: 50 });
      illnessSystem(e);
      expect(e.get(Crew)!.every((c) => c.alive)).toBe(true);
    }
  });
});
