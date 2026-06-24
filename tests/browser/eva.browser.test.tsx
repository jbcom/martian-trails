import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { run } from "@/sim/run";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

const LOADOUT = {
  oxygen: 800,
  water: 200,
  rations: 800,
  parts: 4,
  medkits: 4,
  rtg: 2,
  upgrades: [] as string[],
};

// Real-browser test of the EVA prospecting minigame over the live R3F EvaScene.
describe("EVA Prospecting (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({
      screen: "boot",
      seed: "eva-browser",
      settings: { ...DEFAULT_SETTINGS },
    });
  });
  afterEach(() => cleanup?.());

  it("renders the O₂ clock, scan/drill toggle, carry cap, and grid", () => {
    run.start("eva-browser", LOADOUT);
    run.startEva();
    useGameStore.setState({ screen: "eva" });

    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    expect(container.textContent).toContain("EVA Prospecting");
    expect(container.textContent).toMatch(/O₂/);
    expect(container.textContent).toMatch(/Carry/);
    // Mode toggle + return control are present.
    expect(getByRole("button", { name: "Scan" })).toBeTruthy();
    expect(getByRole("button", { name: "Drill" })).toBeTruthy();
    expect(getByRole("button", { name: /return to rover/i })).toBeTruthy();
    // The field grid renders tappable scan cells.
    expect(container.querySelector('[aria-label^="scan cell"]')).not.toBeNull();
  });

  it("scanning a deposit cell reads hot, drilling banks a haul, and return routes to travel", () => {
    run.start("eva-browser", LOADOUT);
    const session = run.startEva()!;
    const dep = session.deposits.find((d) => d.remaining > 0)!;
    useGameStore.setState({ screen: "eva" });

    const { getByRole, getByLabelText, unmount } = render(<App />);
    cleanup = unmount;

    // Scan the known deposit cell — heat reading banks into the cell state.
    fireEvent.click(getByLabelText(`scan cell ${dep.x},${dep.y}`));
    // Switch to drill and extract.
    fireEvent.click(getByRole("button", { name: "Drill" }));
    fireEvent.click(getByLabelText(`drill cell ${dep.x},${dep.y}`));
    expect(run.currentEva?.haul.drills ?? 0).toBeGreaterThan(0);

    // Return banks the haul and routes back to travel.
    fireEvent.click(getByRole("button", { name: /return to rover/i }));
    expect(useGameStore.getState().screen).toBe("travel");
    expect(run.currentEva).toBeNull();
  });
});
