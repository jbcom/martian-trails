import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "@/App";
import { run } from "@/sim/run";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

/**
 * Responsive layout across the three form-factor classes (m6-3): phone (~390×844),
 * tablet landscape (~1024×768), foldable-wide (~1280×900). Drives the live App in a real
 * browser and resizes the iframe so the CSS breakpoints (tokens --breakpoint-tablet/foldable)
 * actually respond, then asserts the key panels are present + on-screen (nothing clipped to
 * zero) at each class. Pairs with the Safari playtest screenshots in the m6 report.
 */
const PHONE = { w: 390, h: 844 };
const TABLET = { w: 1024, h: 768 };
const FOLDABLE = { w: 1280, h: 900 };

/** A node is laid out + visible if it has a non-zero box and isn't display:none. */
function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * True when the element fits within the app shell horizontally (no real content clip). Measured
 * against the App's own shell box (`w-full overflow-hidden`) rather than raw window.innerWidth, so
 * sub-pixel layout rounding at the shell edge isn't read as a content overflow. A small tolerance
 * absorbs that rounding.
 */
function fitsHorizontally(el: Element | null, shell: Element | null): boolean {
  if (!el || !shell) return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  const shellRect = (shell as HTMLElement).getBoundingClientRect();
  return rect.left >= shellRect.left - 4 && rect.right <= shellRect.right + 4;
}

describe("responsive layout (real browser, three form factors)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({
      screen: "boot",
      seed: "responsive",
      settings: { ...DEFAULT_SETTINGS },
    });
  });
  afterEach(async () => {
    cleanup?.();
    // Restore a sane default viewport for the next file.
    await page.viewport(TABLET.w, TABLET.h);
  });

  it("the depot store panel renders on-screen at phone, tablet, and foldable", async () => {
    useGameStore.setState({ screen: "depot" });

    for (const vp of [PHONE, TABLET, FOLDABLE]) {
      await page.viewport(vp.w, vp.h);
      cleanup?.();
      const { container, unmount } = render(<App />);
      cleanup = unmount;
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      expect(container.textContent, `depot text @${vp.w}`).toContain("UNDERHILL DEPOT");
      const shell = container.firstElementChild;
      const panel = container.querySelector('[class*="pointer-events-auto"]');
      expect(isVisible(panel), `depot panel visible @${vp.w}`).toBe(true);
      expect(fitsHorizontally(panel, shell), `depot panel not clipped @${vp.w}`).toBe(true);
      // The depart control is a ≥44px touch target everywhere.
      const depart = container.querySelector('button[class*="min-h-[44px]"]');
      expect(isVisible(depart), `depart button visible @${vp.w}`).toBe(true);
    }
  });

  it("the travel HUD vitals + controls render on-screen at phone and foldable", async () => {
    run.start("responsive", {
      oxygen: 600,
      water: 600,
      rations: 600,
      parts: 5,
      medkits: 3,
      rtg: 2,
      upgrades: [],
    });
    run.setDriving(true);
    useGameStore.setState({ screen: "travel" });

    for (const vp of [PHONE, FOLDABLE]) {
      await page.viewport(vp.w, vp.h);
      cleanup?.();
      const { container, unmount } = render(<App />);
      cleanup = unmount;
      await new Promise((r) => setTimeout(r, 160));

      // Progress rail + both ends of the trail.
      expect(container.textContent, `travel text @${vp.w}`).toContain("UNDERHILL");
      expect(container.textContent, `travel text @${vp.w}`).toContain("KOROLEV");
      // Vitals gauges present + on-screen.
      const o2 = container.querySelector('[data-gauge="O₂"]');
      const hull = container.querySelector('[data-gauge="Hull"]');
      expect(isVisible(o2), `O₂ gauge visible @${vp.w}`).toBe(true);
      expect(isVisible(hull), `Hull gauge visible @${vp.w}`).toBe(true);
      // The vitals panel must not overflow the app shell horizontally.
      const shell = container.firstElementChild;
      const vitalsPanel = o2?.closest('[class*="pointer-events-auto"]');
      expect(fitsHorizontally(vitalsPanel ?? null, shell), `vitals not clipped @${vp.w}`).toBe(
        true,
      );
    }
  });
});
