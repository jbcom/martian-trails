import { useEffect, useRef } from "react";
import { run } from "@/sim/run";
import { clearRun, recordHighScore, saveRun } from "@/state/savegame";
import { useGameStore } from "@/state/store";

/** Screens during which the rover sim is live and a run is worth persisting. */
const IN_RUN_SCREENS = new Set(["travel", "hazard", "eva", "outpost", "event"]);

/**
 * Run-save lifecycle (m7 hardening). Mounted once at the app shell. Owns:
 *  - autosave: on each Sol advance (polled at snapshot cadence), on every screen change while
 *    in a run, and on visibilitychange / pagehide — so a browser refresh resumes mid-run.
 *  - terminus: bank the won run onto the Hall of Records, then clear the in-progress save.
 *  - gameover: clear the in-progress save (a lost run isn't resumable).
 * Pure sim stays pure — all platform I/O lives here, fired from React effects.
 */
export function useRunPersistence(): void {
  const screen = useGameStore((s) => s.screen);
  const sponsorId = useGameStore((s) => s.sponsorId);
  const lastSavedSol = useRef(0);

  // Terminus / gameover: bank the score (won) and clear the resumable save.
  useEffect(() => {
    if (screen === "terminus") {
      const snap = run.snapshot();
      if (snap && snap.outcome === "won") {
        const survivors = snap.crew.filter((c) => c.alive).length;
        void recordHighScore({
          score: snap.score,
          sol: snap.sol,
          survivors,
          seed: useGameStore.getState().seed ?? "",
          sponsorId,
          date: Date.now(),
        });
      }
      void clearRun();
      return;
    }
    if (screen === "gameover") {
      void clearRun();
    }
  }, [screen, sponsorId]);

  // Save on entering / leaving an in-run screen (captures the depart + each interstitial beat).
  useEffect(() => {
    if (IN_RUN_SCREENS.has(screen)) void saveRun();
  }, [screen]);

  // Save on each fresh Sol while in a run — polled against the live snapshot at ~4Hz so we don't
  // thrash storage every frame, but never miss a Sol (a run is many minutes; this is cheap).
  useEffect(() => {
    if (!IN_RUN_SCREENS.has(screen)) return;
    lastSavedSol.current = run.snapshot()?.sol ?? 0;
    const id = window.setInterval(() => {
      const sol = run.snapshot()?.sol ?? 0;
      if (sol > lastSavedSol.current) {
        lastSavedSol.current = sol;
        void saveRun();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [screen]);

  // Save before the tab is hidden / unloaded — the refresh-resilience guarantee.
  useEffect(() => {
    const flush = () => {
      if (IN_RUN_SCREENS.has(useGameStore.getState().screen)) void saveRun();
    };
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
}
