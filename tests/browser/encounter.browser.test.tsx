import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { getNpc } from "@/content/encounters";
import { run } from "@/sim/run";
import { SECONDS_PER_SOL } from "@/sim/tick";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

const LOADOUT = {
  oxygen: 9000,
  water: 9000,
  rations: 9000,
  parts: 50,
  medkits: 4,
  rtg: 4,
  upgrades: [] as string[],
};

/**
 * Drive until an encounter reaches HAIL (pendingEncounter set), skipping events and
 * hazards. Returns the pending encounter or null if none within budget.
 */
function driveToEncounter(maxSols = 200) {
  const frame = 1 / 60;
  run.setDriving(true);
  for (
    let i = 0;
    i < maxSols && !run.currentEncounter && run.snapshot()?.outcome === "running";
    i++
  ) {
    for (let t = 0; t < SECONDS_PER_SOL; t += frame) run.tick(frame);
    if (run.currentEvent) {
      run.applyEventChoice([]);
      run.setDriving(true);
    }
    if (run.currentHazard) {
      run.resolveHazard(run.currentHazard.options[0].id);
      run.resumeFromHazard();
      run.setDriving(true);
    }
  }
  return run.currentEncounter;
}

describe("Encounter Screen (real browser)", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    useGameStore.setState({
      screen: "boot",
      seed: "enc-browser",
      settings: { ...DEFAULT_SETTINGS },
    });
  });

  afterEach(() => cleanup?.());

  it("renders the NPC name and dialogue lines", () => {
    run.start("enc-browser", LOADOUT);
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();

    useGameStore.setState({ screen: "encounter" });
    const { container, unmount } = render(<App />);
    cleanup = unmount;

    // The panel renders the NPC's dialogue lines and identity header.
    const lines = enc!.resolved.node.lines;
    expect(lines.length).toBeGreaterThan(0);
    expect(container.textContent).toContain(lines[0]);
    const npc = getNpc(enc!.npcId);
    expect(npc).toBeDefined();
    expect(container.textContent).toContain(npc!.name);
  });

  it("clicking a choice clears the encounter and routes back to travel", () => {
    run.start("enc-browser", LOADOUT);
    const enc = driveToEncounter();
    expect(enc).not.toBeNull();

    useGameStore.setState({ screen: "encounter" });
    const { getAllByRole, unmount } = render(<App />);
    cleanup = unmount;

    const buttons = getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);

    expect(run.currentEncounter).toBeNull();
    expect(useGameStore.getState().screen).toBe("travel");
  });
});
