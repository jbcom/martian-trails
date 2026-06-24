import { motion } from "framer-motion";
import { useGameStore } from "@/state/store";

/**
 * Underhill Depot provisioning shell. The glass quartermaster panel sits over the
 * garage scene (the diegetic boot, per docs/DESIGN-SYSTEM.md). The full store —
 * budget, payload cap, buy/sell, launch checks — is built in M5 (m5-2) on the
 * pure sim's store config; this establishes the screen + layout.
 */
export function DepotScreen() {
  const goTo = useGameStore((s) => s.goTo);

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(0,420px)_1fr]">
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-auto m-3 flex flex-col rounded-lg border border-[var(--color-ui-border)] bg-[var(--color-ui-glass)] p-5 backdrop-blur-[var(--blur-glass)] pt-[max(1.25rem,env(safe-area-inset-top))]"
      >
        <p className="font-display text-xs tracking-[0.4em] text-mars-dust">MARTIAN TRAIL</p>
        <h2 className="font-display text-2xl font-bold tracking-wide text-mars-sand">
          UNDERHILL DEPOT
        </h2>
        <p className="text-xs uppercase tracking-widest text-mars-sand/60">
          UNOMA Quartermaster Interface
        </p>

        <p className="mt-6 text-sm text-mars-sand/70">
          Provisioning console — store, payload, and launch checks land here.
        </p>

        <button
          type="button"
          onClick={() => goTo("travel")}
          className="mt-auto rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.12)] px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-mars-sand transition-colors hover:text-mars-dust"
        >
          Clear Airlock &amp; Depart
        </button>
      </motion.aside>
    </div>
  );
}
