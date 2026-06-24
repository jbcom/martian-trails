import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "@/sim/run";
import { Resources, Weather } from "@/sim/traits";
import { getDiagnostics } from "@/state/diagnostics";

/**
 * The frame-cadence bridge wiring (m6-4): the run controller's publish() must mirror the
 * sim's authoritative weather + critical + shake state into the diagnostics object the render
 * layer reads. These assert the wiring the dust-storm overlay, the critical-alarm overlay, and
 * the camera-shake all depend on — exactly the POC gap where the scaffold never surfaced these.
 */
describe("diagnostics bridge — render cues mirror the sim", () => {
  beforeEach(() => {
    run.start("diag-seed");
  });
  afterEach(() => {
    // Leave the bridge clean for other suites.
    run.start("diag-reset");
  });

  it("starts clear, nominal, and unshaken", () => {
    const d = getDiagnostics();
    expect(d.weather).toBe("clear");
    expect(d.critical).toBe(false);
    expect(d.shake).toBe(0);
  });

  it("mirrors a dust storm set on the sim into diagnostics.weather", () => {
    // Reach into the live entity the way the weather system does, then re-publish.
    const e = (run as unknown as { entity: { set: (t: unknown, v: unknown) => void } }).entity;
    e.set(Weather, { kind: "dust_storm" });
    (run as unknown as { publish: () => void }).publish();
    expect(getDiagnostics().weather).toBe("dust_storm");
  });

  it("flags critical when a vital bottoms out (drives the alarm overlay)", () => {
    const e = (
      run as unknown as {
        entity: {
          get: (t: unknown) => Record<string, number>;
          set: (t: unknown, v: unknown) => void;
        };
      }
    ).entity;
    const res = e.get(Resources);
    e.set(Resources, { ...res, oxygen: 0 });
    (run as unknown as { publish: () => void }).publish();
    expect(getDiagnostics().critical).toBe(true);
  });

  it("bumps camera shake when the hull crosses into the critical band", () => {
    const e = (
      run as unknown as {
        entity: {
          get: (t: unknown) => Record<string, number>;
          set: (t: unknown, v: unknown) => void;
        };
      }
    ).entity;
    const res = e.get(Resources);
    // Drop hull into the critical band (≤15% of max) — the shake edge fires once.
    e.set(Resources, { ...res, hull: 5 });
    (run as unknown as { publish: () => void }).publish();
    expect(getDiagnostics().shake).toBeGreaterThan(0);
  });
});
