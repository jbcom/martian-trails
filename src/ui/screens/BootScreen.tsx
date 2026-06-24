import { motion } from "framer-motion";
import { audio } from "@/audio/engine";
import { useGameStore } from "@/state/store";

/**
 * Boot / title screen. The MARTIAN TRAIL wordmark over the live depot scene, with
 * a single call to action. Starting unlocks audio (gesture requirement) and seeds
 * a run, moving to sponsor select. The seed is derived from the title for now;
 * the sponsor screen (M5) will let the player pick.
 */
export function BootScreen() {
  const startRun = useGameStore((s) => s.startRun);

  function begin() {
    audio.unlock();
    audio.playMusic("menu", 0.4);
    startRun(`ares-${Date.now().toString(36)}`);
  }

  return (
    <div className="grid h-full place-items-center px-6 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <div>
          <h1 className="font-display text-5xl font-bold tracking-[0.3em] text-mars-dust drop-shadow-[0_0_18px_rgba(204,112,82,0.5)]">
            MARTIAN TRAIL
          </h1>
          <p className="mt-2 font-display text-xs uppercase tracking-[0.4em] text-mars-sand/70">
            Underhill → Korolev · 2500 km
          </p>
        </div>
        <button
          type="button"
          onClick={begin}
          className="pointer-events-auto rounded border border-[var(--color-ui-border)] bg-[var(--color-ui-glass)] px-8 py-3 font-display text-sm uppercase tracking-[0.25em] text-mars-sand backdrop-blur-[var(--blur-glass)] transition-colors hover:text-mars-dust"
        >
          Begin Expedition
        </button>
      </motion.div>
    </div>
  );
}
