import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import { defaultLoadout, spawnExpedition } from "@/sim/factories";
import {
  Crew,
  MaxResources,
  Outcome,
  Position,
  Resources,
  Terrain,
  Travel,
  Upgrades,
  Weather,
} from "@/sim/traits";

describe("spawnExpedition", () => {
  it("builds the four-member roster all healthy", () => {
    const w = createWorld();
    const e = spawnExpedition(w, "seed");
    const crew = e.get(Crew);
    expect(crew?.map((c) => c.id)).toEqual(["john", "maya", "frank", "nadia"]);
    expect(crew?.every((c) => c.alive && c.condition === "healthy" && c.severity === 0)).toBe(true);
  });

  it("derives max power from RTG count", () => {
    const w = createWorld();
    const e = spawnExpedition(w, "seed", { ...defaultLoadout(), rtg: 3 });
    expect(e.get(MaxResources)?.power).toBe(300);
    expect(e.get(Resources)?.power).toBe(300);
    expect(e.get(Resources)?.rtg).toBe(3);
  });

  it("installs only the purchased upgrades, all catalog flags present", () => {
    const w = createWorld();
    const e = spawnExpedition(w, "seed", { ...defaultLoadout(), upgrades: ["solar", "scrubbers"] });
    const flags = e.get(Upgrades);
    expect(flags?.solar).toBe(true);
    expect(flags?.scrubbers).toBe(true);
    expect(flags?.suspension).toBe(false);
    expect(flags?.aerogel).toBe(false);
    expect(flags?.microHydroponics).toBe(false);
  });

  it("starts at the depot defaults", () => {
    const w = createWorld();
    const e = spawnExpedition(w, "seed");
    expect(e.get(Position)).toMatchObject({ distance: 0, sol: 1, nextOutpost: 0 });
    expect(e.get(Travel)).toMatchObject({ pace: "steady", rationLevel: "filling", driving: true });
    expect(e.get(Terrain)?.zone).toBe(0);
    expect(e.get(Weather)?.kind).toBe("clear");
    expect(e.get(Outcome)?.status).toBe("running");
  });

  it("each spawn owns its own crew array (no shared reference)", () => {
    const w = createWorld();
    const a = spawnExpedition(w, "a");
    const b = spawnExpedition(w, "b");
    a.get(Crew)![0].alive = false;
    expect(b.get(Crew)![0].alive).toBe(true);
  });
});
