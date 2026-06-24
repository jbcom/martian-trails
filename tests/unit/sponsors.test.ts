import { describe, expect, it } from "vitest";
import { allSponsors, DEFAULT_SPONSOR, getSponsor } from "@/content/sponsors";

describe("sponsor registry (difficulty select)", () => {
  it("loads the sponsor roster", () => {
    expect(allSponsors().length).toBeGreaterThanOrEqual(2);
  });

  it("the default sponsor is full UNOMA funding (25000, x1)", () => {
    expect(DEFAULT_SPONSOR.budget).toBe(25000);
    expect(DEFAULT_SPONSOR.scoreMultiplier).toBe(1);
  });

  it("harder sponsors trade budget for a higher score multiplier", () => {
    const sorted = [...allSponsors()].sort((a, b) => b.budget - a.budget);
    for (let i = 1; i < sorted.length; i++) {
      // lower budget => strictly higher multiplier
      expect(sorted[i].budget).toBeLessThan(sorted[i - 1].budget);
      expect(sorted[i].scoreMultiplier).toBeGreaterThan(sorted[i - 1].scoreMultiplier);
    }
  });

  it("looks up by id", () => {
    expect(getSponsor(DEFAULT_SPONSOR.id)).toBe(DEFAULT_SPONSOR);
    expect(getSponsor("no-such-sponsor")).toBeUndefined();
  });
});
