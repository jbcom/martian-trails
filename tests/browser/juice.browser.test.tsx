import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { run } from "@/sim/run";
import { Resources, Weather } from "@/sim/traits";
import { getDiagnostics } from "@/state/diagnostics";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

/**
 * Juice systems (m6-4) over the live App in a real browser: the critical-alarm vignette
 * overlay (driven by diagnostics.critical) and the dust-storm weather state reaching the
 * render bridge (driven by the sim's Weather trait). These prove the wiring end-to-end —
 * sim state → diagnostics bridge → the DOM/render layer reacts.
 */
function liveEntity() {
  return (
    run as unknown as {
      entity: {
        get: (t: unknown) => Record<string, number>;
        set: (t: unknown, v: unknown) => void;
      };
    }
  ).entity;
}
function republish() {
  (run as unknown as { publish: () => void }).publish();
}

describe("juice — critical alarm + dust-storm wiring (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({ screen: "travel", seed: "juice", settings: { ...DEFAULT_SETTINGS } });
    run.start("juice");
    run.setDriving(true);
  });
  afterEach(() => {
    cleanup?.();
    run.start("juice-reset");
  });

  it("shows the critical-alarm vignette overlay when a vital bottoms out", async () => {
    const { container, unmount } = render(<App />);
    cleanup = unmount;
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    // Not critical yet → no alarm overlay.
    expect(container.querySelector('[data-alarm="critical"]')).toBeNull();

    // Bottom out O₂ → critical edge → the overlay's rAF watcher flips it on.
    const e = liveEntity();
    e.set(Resources, { ...e.get(Resources), oxygen: 0 });
    republish();
    expect(getDiagnostics().critical).toBe(true);

    // Give the overlay's rAF a couple frames to pick up the critical edge.
    await new Promise((r) => setTimeout(r, 120));
    expect(container.querySelector('[data-alarm="critical"]')).not.toBeNull();
  });

  it("propagates a dust storm from the sim Weather trait to the diagnostics bridge", async () => {
    const { unmount } = render(<App />);
    cleanup = unmount;
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    expect(getDiagnostics().weather).toBe("clear");
    const e = liveEntity();
    e.set(Weather, { kind: "dust_storm" });
    republish();
    expect(getDiagnostics().weather).toBe("dust_storm");
  });

  it("suppresses the alarm pulse animation class under reduced-motion", async () => {
    useGameStore.setState({ settings: { ...DEFAULT_SETTINGS, reducedMotion: true } });
    const { container, unmount } = render(<App />);
    cleanup = unmount;

    const e = liveEntity();
    e.set(Resources, { ...e.get(Resources), morale: 0 });
    republish();
    await new Promise((r) => setTimeout(r, 120));

    const overlay = container.querySelector('[data-alarm="critical"]');
    expect(overlay).not.toBeNull();
    // Reduced-motion holds the vignette steady — no pulse animation class.
    expect(overlay?.className).not.toContain("animate-alarm-pulse");
  });
});
