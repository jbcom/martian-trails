import { useEffect, useRef, useState } from "react";
import type { Screen } from "@/core/screens";
import { buildLoadout, type DepotState } from "@/sim/loadout";
import { type RunSnapshot, run } from "@/sim/run";
import { useGameStore } from "@/state/store";

/** Screens during which the rover sim is live and the rAF loop must run. */
const IN_RUN_SCREENS: ReadonlySet<Screen> = new Set([
  "travel",
  "hazard",
  "eva",
  "outpost",
  "event",
]);

/** Snapshot publish cadence — ~10Hz. Per-frame data is on the diagnostics bridge. */
const SNAPSHOT_INTERVAL_MS = 100;

/**
 * The React ↔ run-controller bridge. Drives `run.tick(dt)` on requestAnimationFrame
 * while the active screen is in-run, and republishes `run.snapshot()` into React
 * state at a throttled ~10Hz cadence (never per-frame — the 3D scenes read the
 * diagnostics bridge directly). Owns the outcome → terminus/gameover routing and
 * the event-pause → "event" screen routing.
 *
 * @param autoStart  Begin a fresh run with `loadout` once a seed is set (the depot's
 *                   "depart" flow already calls run.start itself; the travel screen
 *                   uses this only as a fallback so a deep-link never lands on a dead
 *                   sim).
 */
export function useRun(
  opts: { autoStart?: boolean; loadout?: DepotState } = {},
): RunSnapshot | null {
  const screen = useGameStore((s) => s.screen);
  const seed = useGameStore((s) => s.seed);
  const goTo = useGameStore((s) => s.goTo);
  const [snap, setSnap] = useState<RunSnapshot | null>(() => run.snapshot());

  const lastPublish = useRef(0);
  const lastFrame = useRef(0);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // Fallback start: if we land on an in-run screen with a seed but no live sim,
  // spin one up so the screen is never a dead end (the depot start is preferred).
  useEffect(() => {
    if (!opts.autoStart || !seed) return;
    if (!run.snapshot()) {
      run.start(seed, opts.loadout ? buildLoadout(opts.loadout) : undefined);
      run.setDriving(true);
    }
  }, [opts.autoStart, opts.loadout, seed]);

  useEffect(() => {
    if (!IN_RUN_SCREENS.has(screen)) return;
    let raf = 0;
    lastFrame.current = performance.now();

    const frame = (now: number) => {
      const dt = (now - lastFrame.current) / 1000;
      lastFrame.current = now;
      run.tick(dt);

      if (now - lastPublish.current >= SNAPSHOT_INTERVAL_MS) {
        lastPublish.current = now;
        const s = run.snapshot();
        setSnap(s);
        if (s) routeFromSnapshot(s, screenRef.current, goTo);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [screen, goTo]);

  return snap;
}

/**
 * Drive screen transitions off the latest snapshot: terminal outcomes route to the
 * terminus/gameover screens; a freshly raised event pops the event modal screen;
 * resolving it (back on the travel screen) is handled by the modal itself.
 */
function routeFromSnapshot(s: RunSnapshot, current: Screen, goTo: (screen: Screen) => void): void {
  if (s.outcome === "won" && current !== "terminus") {
    goTo("terminus");
    return;
  }
  if (s.outcome === "lost" && current !== "gameover") {
    goTo("gameover");
    return;
  }
  // A hazard on the road takes precedence — route to the traverse screen.
  if (s.pendingHazard && current === "travel") {
    goTo("hazard");
    return;
  }
  if (s.pendingEvent && current === "travel") {
    goTo("event");
  }
}
