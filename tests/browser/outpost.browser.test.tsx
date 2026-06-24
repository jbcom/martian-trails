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
    if (run.currentEncounter) {
      run.respondEncounter("decline");
      run.setDriving(true);
    }
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
    expect(container.textContent).toContain("Route Council");
    expect(container.textContent).toContain("Veteran");
    expect(container.textContent).toContain("Corporate Liaison");
    expect(container.textContent).toContain("Rest in Habitat");
    expect(container.textContent).toContain("Local Exchange");
  });

  it("lets the player adjudicate the veteran/liaison advice pair once", () => {
    run.start("op-browser", LOADOUT);
    const stop = driveToOutpost();
    expect(stop).not.toBeNull();
    useGameStore.setState({ screen: "outpost" });

    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    fireEvent.click(getByRole("button", { name: /follow veteran/i }));
    expect(container.textContent).toContain("Advice logged");
    expect(run.snapshot()?.encounterFlags).toContain("flag:advice:tharsis:veteran");
    expect((getByRole("button", { name: /follow liaison/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
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
