import { describe, expect, it } from "vitest";
import { outcomeSystem } from "@/sim/systems/outcome";
import { Crew, Outcome, Position, Resources } from "@/sim/traits";
import { makeExpedition } from "./_util";

describe("outcomeSystem — win/lose conditions", () => {
  it("loses when all crew are dead (highest precedence)", () => {
    const { e } = makeExpedition("o");
    const crew = e.get(Crew)!;
    for (const c of crew) c.alive = false;
    e.set(Crew, crew);
    e.set(Resources, { oxygen: 0, hull: 0 }); // even with other failures, crew-death wins precedence
    outcomeSystem(e);
    expect(e.get(Outcome)!.status).toBe("lost");
    expect(e.get(Outcome)!.reason).toContain("All crew deceased");
  });

  it("loses on asphyxiation when oxygen hits zero with crew alive", () => {
    const { e } = makeExpedition("o");
    e.set(Resources, { oxygen: 0, hull: 100 });
    outcomeSystem(e);
    expect(e.get(Outcome)!.status).toBe("lost");
    expect(e.get(Outcome)!.reason).toContain("Asphyxiation");
  });

  it("loses on hull failure", () => {
    const { e } = makeExpedition("o");
    e.set(Resources, { oxygen: 100, hull: 0 });
    outcomeSystem(e);
    expect(e.get(Outcome)!.status).toBe("lost");
    expect(e.get(Outcome)!.reason).toContain("hull failure");
  });

  it("wins on reaching the total distance", () => {
    const { e } = makeExpedition("o");
    e.set(Resources, { oxygen: 100, hull: 100 });
    e.set(Position, { distance: 2500 });
    outcomeSystem(e);
    expect(e.get(Outcome)!.status).toBe("won");
    expect(e.get(Outcome)!.reason).toContain("Korolev");
  });

  it("stays running when nothing terminal has happened", () => {
    const { e } = makeExpedition("o");
    e.set(Resources, { oxygen: 100, hull: 100 });
    e.set(Position, { distance: 1000 });
    outcomeSystem(e);
    expect(e.get(Outcome)!.status).toBe("running");
  });

  it("does not overwrite an already-decided outcome", () => {
    const { e } = makeExpedition("o");
    e.set(Outcome, { status: "won", reason: "first" });
    e.set(Resources, { oxygen: 0 });
    outcomeSystem(e);
    expect(e.get(Outcome)!.status).toBe("won");
    expect(e.get(Outcome)!.reason).toBe("first");
  });
});
