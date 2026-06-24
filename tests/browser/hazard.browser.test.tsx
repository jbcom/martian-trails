import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { run } from "@/sim/run";
import { SECONDS_PER_SOL } from "@/sim/tick";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

const LOADOUT = {
  oxygen: 9000,
  water: 9000,
  rations: 9000,
  parts: 8,
  medkits: 4,
  rtg: 4,
  upgrades: [] as string[],
};

/** Drive Sols until a hazard is raised, clearing any random events along the way. */
function driveToHazard(maxSols = 400) {
  const frame = 1 / 60;
  run.setDriving(true);
  for (let i = 0; i < maxSols && !run.currentHazard && run.snapshot()?.outcome === "running"; i++) {
    for (let t = 0; t < SECONDS_PER_SOL; t += frame) run.tick(frame);
    if (run.currentEvent) {
      run.applyEventChoice([]);
      run.setDriving(true);
    }
  }
  return run.currentHazard;
}

// Real-browser test of the Hazard Traverse set-piece over the live R3F HazardScene.
describe("Hazard Traverse (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({
      screen: "boot",
      seed: "hz-browser",
      settings: { ...DEFAULT_SETTINGS },
    });
  });
  afterEach(() => cleanup?.());

  it("renders the hazard name, read gauge, and approach options", () => {
    run.start("hz-browser", LOADOUT);
    const hazard = driveToHazard();
    expect(hazard).not.toBeNull();
    useGameStore.setState({ screen: "hazard" });

    const { container, unmount } = render(<App />);
    cleanup = unmount;

    expect(container.textContent).toContain("Hazard Traverse");
    expect(container.textContent).toContain(hazard?.name ?? "");
    // The read gauge label (e.g. "Width" / "Density") is shown as the instrument.
    expect(container.textContent).toContain(hazard?.readLabel ?? "");
    // At least one approach option label renders as a button.
    expect(container.textContent).toContain(hazard?.options[0].label ?? "");
  });

  it("choosing an approach resolves the traverse and shows the consequence + resume", async () => {
    run.start("hz-browser", LOADOUT);
    const hazard = driveToHazard();
    expect(hazard).not.toBeNull();
    useGameStore.setState({ screen: "hazard" });

    const { findByRole, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    const opt = hazard!.options[0];
    fireEvent.click(getByRole("button", { name: new RegExp(opt.label, "i") }));

    // The hazard is resolved and the consequence beat + resume control appear (the
    // AnimatePresence cross-fade resolves asynchronously, so await the resume control).
    expect(run.currentHazard).toBeNull();
    const resume = await findByRole("button", { name: /resume expedition/i });

    // Resuming routes back to travel.
    fireEvent.click(resume);
    expect(useGameStore.getState().screen).toBe("travel");
  });
});
