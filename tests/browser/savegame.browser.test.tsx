import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { run } from "@/sim/run";
import { SECONDS_PER_SOL } from "@/sim/tick";
import { loadRun, saveRun } from "@/state/savegame";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

const LOADOUT = {
  oxygen: 99999,
  water: 99999,
  rations: 99999,
  parts: 999,
  medkits: 99,
  rtg: 8,
  upgrades: [] as string[],
};

/** Tick `seconds` of wall-clock in ~60fps frames. */
function tickFrames(seconds: number) {
  const frame = 1 / 60;
  for (let t = 0; t < seconds; t += frame) run.tick(frame);
}

/** Drive one Sol, clearing any interstitial halts so the rover keeps rolling. */
function driveSol() {
  run.setDriving(true);
  tickFrames(SECONDS_PER_SOL);
  if (run.currentHazard) {
    run.resolveHazard(run.currentHazard.options[0].id);
    run.resumeFromHazard();
  }
  if (run.currentOutpost) run.leaveOutpost();
  if (run.currentEvent) run.applyEventChoice([]);
  run.setDriving(true);
}

// Real-browser tests of the m7 save/continue + high-score wiring over the live App
// (WebGL needs a real browser; jsdom can't render the R3F canvas the screens sit on).
describe("save / continue + Hall of Records (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({ screen: "boot", seed: null, settings: { ...DEFAULT_SETTINGS } });
  });
  afterEach(() => cleanup?.());

  it("shows Continue Expedition on boot when a saved run exists, and resumes it", async () => {
    // Stand up a live run, drive a few Sols, and persist it (the autosave path).
    run.start("resume-seed", LOADOUT);
    run.setDriving(true);
    tickFrames(SECONDS_PER_SOL * 3);
    const savedSol = run.snapshot()?.sol ?? 0;
    await saveRun();
    expect(savedSol).toBeGreaterThan(1);

    // Tear the live run down (as a refresh would) and boot the app fresh.
    run.start("unrelated", LOADOUT);
    useGameStore.setState({ screen: "boot" });
    const { getByRole, findByRole, unmount } = render(<App />);
    cleanup = unmount;

    // The Continue button appears once the save loads, and resumes mid-run on click.
    const cont = await findByRole("button", { name: /continue expedition/i });
    fireEvent.click(cont);
    expect(useGameStore.getState().screen).toBe("travel");
    expect(run.snapshot()?.sol).toBe(savedSol);
    // A plain "Begin"/"New" path is still offered alongside.
    expect(getByRole("button", { name: /new expedition/i })).toBeTruthy();
  });

  it("empty board shows the no-records copy on boot", async () => {
    const { findByText, unmount } = render(<App />);
    cleanup = unmount;
    expect(await findByText(/no expeditions on record/i)).toBeTruthy();
  });

  it("finishing a won run banks the score and the menu shows it on the board", async () => {
    // Restore a near-goal run so a single Sol crests Korolev (winning organically is many Sols).
    run.start("victory-seed", LOADOUT);
    const save = run.serialize();
    expect(save).not.toBeNull();
    save!.position.distance = 2480;
    run.restore(save!);

    // Mount on travel and let useRun's loop carry the win → terminus routing + score banking.
    useGameStore.setState({ screen: "travel", seed: "victory-seed" });
    const { container, unmount } = render(<App />);
    cleanup = unmount;

    // Drive the rover over the finish line.
    for (let i = 0; i < 10 && run.snapshot()?.outcome === "running"; i++) driveSol();
    expect(run.snapshot()?.outcome).toBe("won");
    const finalScore = run.snapshot()?.score ?? 0;
    expect(finalScore).toBeGreaterThan(0);

    // The router lands on terminus; the won run is cleared from the resumable slot.
    await waitFor(() => expect(useGameStore.getState().screen).toBe("terminus"));
    await waitFor(async () => expect(await loadRun()).toBeNull());

    // Terminus itself surfaces the Hall of Records with this run's banked score.
    await waitFor(
      () => {
        expect(container.textContent).toContain("KOROLEV CRATER");
        expect(container.textContent).toContain("Hall of Records");
        expect(container.textContent).toContain(String(finalScore));
      },
      { timeout: 3000 },
    );

    // "New Expedition" returns to the menu, which also lists the banked score. Reset the run
    // first (as a real fresh start does) so the won-state router doesn't bounce off boot.
    run.start("post-victory", LOADOUT);
    useGameStore.setState({ screen: "boot", seed: null });
    await waitFor(() => {
      expect(container.textContent).toContain("Hall of Records");
      expect(container.textContent).toContain(String(finalScore));
    });
  });
});
