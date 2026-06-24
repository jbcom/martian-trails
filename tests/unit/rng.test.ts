import { describe, expect, it } from "vitest";
import { createRng } from "@/core/rng";

describe("createRng — seeded determinism", () => {
  it("same seed produces the same sequence", () => {
    const a = createRng("mars");
    const b = createRng("mars");
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds diverge", () => {
    const a = createRng("seed-a");
    const b = createRng("seed-b");
    expect(a.next()).not.toBe(b.next());
  });

  it("int stays within inclusive bounds", () => {
    const r = createRng("ints");
    for (let i = 0; i < 1000; i++) {
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("range stays within [min, max)", () => {
    const r = createRng("range");
    for (let i = 0; i < 1000; i++) {
      const n = r.range(1, 2);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThan(2);
    }
  });

  it("pick throws on empty and returns a member otherwise", () => {
    const r = createRng("pick");
    expect(() => r.pick([])).toThrow();
    const items = ["a", "b", "c"] as const;
    expect(items).toContain(r.pick(items));
  });

  it("fork is deterministic and independent of the parent stream position", () => {
    const parent1 = createRng("run");
    parent1.next(); // advance parent
    const forkA = parent1.fork("hazard");

    const parent2 = createRng("run");
    const forkB = parent2.fork("hazard");

    expect(forkA.next()).toBe(forkB.next());
  });

  it("chance(0) is never true and chance(1) is always true", () => {
    const r = createRng("chance");
    for (let i = 0; i < 50; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });
});
