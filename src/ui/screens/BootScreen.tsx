import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { audio } from "@/audio/engine";
import type { RunSave } from "@/schemas/save";
import { run } from "@/sim/run";
import { loadHighScores, loadRun } from "@/state/savegame";
import { useGameStore } from "@/state/store";
import { HallOfRecords } from "@/ui/components/HallOfRecords";

/**
 * Boot / title screen. The MARTIAN TRAIL wordmark over the live depot scene. "Begin
 * Expedition" unlocks audio (gesture requirement), seeds a run, and moves to sponsor select.
 * If a saved in-progress run exists (m7), a "Continue Expedition" button restores it and
 * routes straight to the trail. The Hall of Records lists the top UNOMA ratings below.
 */
export function BootScreen() {
  const startRun = useGameStore((s) => s.startRun);
  const goTo = useGameStore((s) => s.goTo);
  const scores = useGameStore((s) => s.highScores);
  const [saved, setSaved] = useState<RunSave | null>(null);

  // Load the resumable run + refresh the high-score board once on mount (both zod-guarded →
  // degrade clean). The board lands in the store, so the panel below renders reactively.
  useEffect(() => {
    let live = true;
    void loadRun().then((s) => {
      if (live) setSaved(s);
    });
    void loadHighScores();
    return () => {
      live = false;
    };
  }, []);

  function begin() {
    audio.unlock();
    audio.playMusic("menu", 0.4);
    startRun(`ares-${Date.now().toString(36)}`);
  }

  function continueExpedition() {
    if (!saved) return;
    audio.unlock();
    audio.playMusic("menu", 0.4);
    run.restore(saved);
    useGameStore.setState({ seed: saved.seed });
    goTo("travel");
  }

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-[max(2rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex w-full max-w-sm flex-shrink-0 flex-col items-center gap-6 text-center"
      >
        <div>
          <h1 className="font-display text-5xl font-bold tracking-[0.3em] text-mars-dust drop-shadow-[0_0_18px_rgba(204,112,82,0.5)]">
            MARTIAN TRAIL
          </h1>
          <p className="mt-2 font-display text-xs uppercase tracking-[0.4em] text-mars-sand/70">
            Underhill → Korolev · 2500 km
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3">
          {saved && (
            <button
              type="button"
              onClick={continueExpedition}
              className="pointer-events-auto rounded border border-[var(--color-ok)] bg-[rgba(68,255,170,0.1)] px-8 py-3 font-display text-sm uppercase tracking-[0.25em] text-mars-sand backdrop-blur-[var(--blur-glass)] transition-colors hover:text-mars-dust"
            >
              Continue Expedition
              <span className="mt-0.5 block font-mono text-[0.6rem] tracking-normal text-mars-sand/55 normal-case">
                Sol {saved.position.sol} · {Math.round(saved.position.distance)} km
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={begin}
            className="pointer-events-auto rounded border border-[var(--color-ui-border)] bg-[var(--color-ui-glass)] px-8 py-3 font-display text-sm uppercase tracking-[0.25em] text-mars-sand backdrop-blur-[var(--blur-glass)] transition-colors hover:text-mars-dust"
          >
            {saved ? "New Expedition" : "Begin Expedition"}
          </button>
        </div>
        <HallOfRecords scores={scores} className="pointer-events-auto" />
      </motion.div>
    </div>
  );
}
