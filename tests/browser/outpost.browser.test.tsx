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

/** Drive Sols until the rover docks at an outpost, clearing hazards + events along the way. */
function driveToOutpost(maxSols = 800) {
  const frame = 1 / 60;
  run.setDriving(true);
  for (
    let i = 0;
    i < maxSols && !run.currentOutpost && run.snapshot()?.outcome === "running";
    i++
  ) {
    for (let t = 0; t < SECONDS_PER_SOL; t += frame) run.tick(frame);
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
      run.setDriving(true);
    }
    if (run.currentEvent) {
      run.applyEventChoice([]);
      run.setDriving(true);
    }
  }
  return run.currentOutpost;
}

// Real-browser test of the outpost dock screen over the live R3F OutpostScene.
describe("Outpost Dock (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({
      screen: "boot",
      seed: "op-browser",
      settings: { ...DEFAULT_SETTINGS },
    });
  });
  afterEach(() => cleanup?.());

  it("renders the outpost name, colonist news, rest action, and exchange", () => {
    run.start("op-browser", LOADOUT);
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    useGameStore.setState({ screen: "outpost" });

    const { container, unmount } = render(<App />);
    cleanup = unmount;

    expect(container.textContent).toContain(stop?.name ?? "");
    expect(container.textContent).toContain("Colonist News");
    expect(container.textContent).toContain("Rest in Habitat");
    expect(container.textContent).toContain("Local Exchange");
  });

  it("Back on the Trail leaves the outpost and resumes travel", async () => {
    run.start("op-browser", LOADOUT);
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    useGameStore.setState({ screen: "outpost" });

    const { getByRole, unmount } = render(<App />);
    cleanup = unmount;

    fireEvent.click(getByRole("button", { name: /back on the trail/i }));
    expect(run.currentOutpost).toBeNull();
    expect(useGameStore.getState().screen).toBe("travel");
  });
});
