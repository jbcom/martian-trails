import { fireEvent, render } from "@testing-library/react";
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
 * zero) at each class. Pairs with browser-visible screenshot artifacts.
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
 * sub-pixel layout rounding and the Vitest browser iframe shell edge aren't read as content
 * overflow. A small tolerance absorbs that harness difference.
 */
function fitsHorizontally(el: Element | null, shell: Element | null): boolean {
  if (!el || !shell) return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  const shellRect = (shell as HTMLElement).getBoundingClientRect();
  return rect.left >= shellRect.left - 16 && rect.right <= shellRect.right + 16;
}

function rectSummary(el: Element | null, shell: Element | null): string {
  if (!el || !shell) return "missing rect target";
  const rect = (el as HTMLElement).getBoundingClientRect();
  const shellRect = (shell as HTMLElement).getBoundingClientRect();
  return JSON.stringify({
    rect: {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
    },
    shell: {
      left: Math.round(shellRect.left),
      right: Math.round(shellRect.right),
      width: Math.round(shellRect.width),
    },
  });
}

const settleMotion = () => new Promise((r) => setTimeout(r, 340));

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

  it("the depot profile layout keeps station actions and manifest terminal on-screen", async () => {
    useGameStore.setState({ screen: "depot" });

    for (const [profileName, vp] of [
      ["phone", PHONE],
      ["tablet", TABLET],
      ["foldable", FOLDABLE],
    ] as const) {
      await page.viewport(vp.w, vp.h);
      cleanup?.();
      const { container, getByRole, unmount } = render(<App />);
      cleanup = unmount;
      await settleMotion();

      expect(container.textContent, `depot text @${vp.w}`).toContain("UNDERHILL DEPOT");
      const shell = container.firstElementChild;
      const profile = container.querySelector("[data-device-profile]");
      expect(profile?.getAttribute("data-device-profile"), `device profile @${vp.w}`).toBe(
        profileName,
      );
      const depart = getByRole("button", { name: /clear airlock/i });
      const recruit = getByRole("button", { name: /recruit co-driver/i });
      const manifestActionLocked = getByRole("button", { name: /manifest terminal/i });
      expect((manifestActionLocked as HTMLButtonElement).disabled).toBe(true);
      expect(isVisible(recruit), `co-driver action visible @${vp.w}`).toBe(true);
      expect(isVisible(manifestActionLocked), `manifest action visible @${vp.w}`).toBe(true);
      expect(isVisible(depart), `depart button visible @${vp.w}`).toBe(true);
      const actionDock = container.querySelector('[data-testid="depot-action-dock"]');
      expect(
        fitsHorizontally(actionDock, shell),
        `action dock not clipped @${vp.w}: ${rectSummary(actionDock, shell)}`,
      ).toBe(true);
      // The depart control is a >=44px touch target before any phone panel yields the dock.
      expect(
        depart.getBoundingClientRect().height,
        `depart touch target @${vp.w}`,
      ).toBeGreaterThanOrEqual(44);

      fireEvent.click(recruit);
      await settleMotion();
      expect(container.textContent, `co-driver station @${vp.w}`).toContain("Rover Berth");
      fireEvent.click(getByRole("button", { name: /recruit okonkwo/i }));
      await settleMotion();

      const manifestAction = getByRole("button", { name: /manifest terminal/i });
      expect((manifestAction as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(manifestAction);
      const panel = container.querySelector('[data-testid="depot-station-panel"]');
      expect(isVisible(panel), `manifest panel visible @${vp.w}`).toBe(true);
      expect(fitsHorizontally(panel, shell), `manifest panel not clipped @${vp.w}`).toBe(true);
      expect(container.textContent, `manifest supplies @${vp.w}`).toContain("Liquid O2");
      if (profileName === "phone") {
        expect(isVisible(actionDock), `phone dock yields to open panel @${vp.w}`).toBe(false);
      } else {
        expect(isVisible(actionDock), `wide dock remains visible @${vp.w}`).toBe(true);
      }
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
      await settleMotion();

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
      expect(
        fitsHorizontally(vitalsPanel ?? null, shell),
        `vitals not clipped @${vp.w}: ${rectSummary(vitalsPanel ?? null, shell)}`,
      ).toBe(true);
    }
  });
});
