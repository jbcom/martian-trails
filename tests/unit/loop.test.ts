import { describe, expect, it } from "vitest";
import { advance, createLoopState, FIXED_DT, MAX_STEPS_PER_FRAME } from "@/engine/loop";

describe("fixed-timestep loop", () => {
  it("runs exactly one step for one fixed dt", () => {
    const s = createLoopState();
    const ran = advance(s, FIXED_DT, () => {});
    expect(ran).toBe(1);
  });

  it("runs no steps for a sub-step delta and accumulates", () => {
    const s = createLoopState();
    expect(advance(s, FIXED_DT / 2, () => {})).toBe(0);
    expect(advance(s, FIXED_DT / 2, () => {})).toBe(1); // accumulated to a full step
  });

  it("steps with a constant dt regardless of frame delta", () => {
    const s = createLoopState();
    const dts: number[] = [];
    advance(s, FIXED_DT * 3, (dt) => dts.push(dt));
    expect(dts).toEqual([FIXED_DT, FIXED_DT, FIXED_DT]);
  });

  it("caps steps per frame (spiral-of-death guard)", () => {
    const s = createLoopState();
    const ran = advance(s, 10, () => {}); // huge delta
    expect(ran).toBeLessThanOrEqual(MAX_STEPS_PER_FRAME);
  });

  it("exposes a render-interpolation alpha in [0, 1)", () => {
    const s = createLoopState();
    advance(s, FIXED_DT * 1.5, () => {});
    expect(s.alpha).toBeGreaterThanOrEqual(0);
    expect(s.alpha).toBeLessThan(1);
  });

  it("ignores negative deltas", () => {
    const s = createLoopState();
    expect(advance(s, -5, () => {})).toBe(0);
    expect(s.accumulator).toBe(0);
  });
});
