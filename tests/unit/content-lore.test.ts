import { describe, expect, it } from "vitest";
import { allLore, loreFor } from "@/content/lore";

describe("outpost lore registry", () => {
  it("loads lore for the three outposts", () => {
    expect(allLore().length).toBe(3);
  });

  it("every outpost has at least one usable line", () => {
    for (const l of allLore()) {
      expect(l.lines.length).toBeGreaterThan(0);
      for (const line of l.lines) expect(line.length).toBeLessThanOrEqual(160);
    }
  });

  it("looks up lore by outpost name", () => {
    const first = allLore()[0];
    expect(loreFor(first.outpost)).toEqual(first.lines);
    expect(loreFor("Nowhere Base")).toHaveLength(0);
  });
});
