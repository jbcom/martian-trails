import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

describe("Depot diegetic social stations (real browser)", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    useGameStore.setState({
      screen: "depot",
      seed: "depot-social",
      settings: { ...DEFAULT_SETTINGS },
    });
  });

  afterEach(() => cleanup?.());

  it("renders station actions instead of a passive news block or open store panel", () => {
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    expect(container.textContent).toContain("UNDERHILL DEPOT");
    expect(container.textContent).toContain("Recruit Co-driver");
    expect(container.textContent).toContain("Manifest Terminal");
    expect(container.textContent).toContain("Talk to Okonkwo");
    expect(container.textContent).toContain("Talk to Reyes");
    expect(
      (getByRole("button", { name: /manifest terminal/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(container.textContent).toContain("Quartermaster");
    expect(container.textContent).toContain("Navigator");
    expect(container.textContent).not.toContain("Briefed");
    expect(container.textContent).not.toContain("Route tip logged");
    expect(container.textContent).not.toContain("Liquid O2");
    expect(container.textContent).not.toContain("Colonist News");
  });

  it("locks provisioning until a co-driver is recruited", () => {
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    const manifest = getByRole("button", { name: /manifest terminal/i }) as HTMLButtonElement;
    expect(manifest.disabled).toBe(true);

    fireEvent.click(getByRole("button", { name: /recruit co-driver/i }));
    expect(container.textContent).toContain("Rover Berth");
    fireEvent.click(getByRole("button", { name: /recruit okonkwo/i }));

    const unlocked = getByRole("button", { name: /manifest terminal/i }) as HTMLButtonElement;
    expect(unlocked.disabled).toBe(false);
    fireEvent.click(unlocked);
    expect(container.textContent).toContain("Liquid O2");
  });

  it("resolves a depot NPC bank and records the briefing flag in the UI", () => {
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    fireEvent.click(getByRole("button", { name: /talk to okonkwo/i }));
    expect(container.textContent).toContain("Quartermaster Okonkwo");
    expect(container.textContent).toContain("dust season's early");

    fireEvent.click(getByRole("button", { name: /inspect the manifest/i }));
    expect(container.textContent).toContain("Briefed");
  });

  it("keeps the depot controls reachable when an encounter card is open", () => {
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    fireEvent.click(getByRole("button", { name: /talk to okonkwo/i }));

    const panel = container.querySelector(
      '[data-testid="depot-station-panel"]',
    ) as HTMLElement | null;
    expect(isVisible(panel)).toBe(true);
    expect(panel ? getComputedStyle(panel).overflowY : "").not.toBe("scroll");

    const profile = container
      .querySelector("[data-device-profile]")
      ?.getAttribute("data-device-profile");
    if (profile === "phone") {
      const dock = container.querySelector('[data-testid="depot-action-dock"]');
      expect(isVisible(dock)).toBe(false);
      fireEvent.click(getByRole("button", { name: /close okonkwo/i }));
    }

    const depart = getByRole("button", { name: /clear airlock/i });
    expect(isVisible(depart)).toBe(true);
  });
});
