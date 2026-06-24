import { describe, expect, it } from "vitest";
import { computeScore, scoringSystem } from "@/sim/systems/scoring";
import { Crew, Outcome, Position, Resources } from "@/sim/traits";
import { makeExpedition } from "./_util";

// score = max(0, 1000 + survivors*500 + floor((O2+water+rations)/5) - sol*15).
describe("computeScore", () => {
  it("matches the canonical POC formula", () => {
    expect(computeScore({ survivors: 4, oxygen: 200, water: 150, rations: 100, sol: 30 })).toBe(
      1000 + 4 * 500 + Math.floor((200 + 150 + 100) / 5) - 30 * 15,
    );
  });

  it("floors negative scores at zero", () => {
    expect(computeScore({ survivors: 0, oxygen: 0, water: 0, rations: 0, sol: 1000 })).toBe(0);
  });

  it("floors the resource term (integer division by 5)", () => {
    expect(computeScore({ survivors: 0, oxygen: 4, water: 0, rations: 0, sol: 0 })).toBe(1000);
    expect(computeScore({ survivors: 0, oxygen: 9, water: 0, rations: 0, sol: 0 })).toBe(1001);
  });
});

describe("scoringSystem", () => {
  it("stamps the score onto Outcome only when won", () => {
    const { e } = makeExpedition("score");
    e.set(Resources, { oxygen: 100, water: 100, rations: 100 });
    e.set(Position, { sol: 50 });
    e.set(Outcome, { status: "won" });
    scoringSystem(e);
    expect(e.get(Outcome)!.score).toBe(
      computeScore({ survivors: 4, oxygen: 100, water: 100, rations: 100, sol: 50 }),
    );
  });

  it("does nothing while still running", () => {
    const { e } = makeExpedition("score");
    e.set(Outcome, { status: "running", score: 0 });
    scoringSystem(e);
    expect(e.get(Outcome)!.score).toBe(0);
  });

  it("counts only living survivors", () => {
    const { e } = makeExpedition("score");
    const crew = e.get(Crew)!;
    crew[0].alive = false;
    crew[1].alive = false;
    e.set(Crew, crew);
    e.set(Resources, { oxygen: 0, water: 0, rations: 0 });
    e.set(Position, { sol: 0 });
    e.set(Outcome, { status: "won" });
    scoringSystem(e);
    expect(e.get(Outcome)!.score).toBe(1000 + 2 * 500);
  });
});
