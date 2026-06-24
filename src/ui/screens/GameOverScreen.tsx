import { motion } from "framer-motion";
import { config } from "@/config";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";

/** Crew display name from the roster config, falling back to the id. */
function crewName(id: string): string {
  return config.crew.roster.find((m) => m.id === id)?.name ?? id;
}

/**
 * Game over — the expedition is lost. A stark memorial: the named cause of failure,
 * a per-crew status roll (the design's "Nadia succumbed to … , Sol N" tone), and a
 * single way forward. "New Expedition" returns to boot.
 */
export function GameOverScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const snap = run.snapshot();
  const sol = snap?.sol ?? 0;
  const lost = snap?.crew.filter((c) => !c.alive) ?? [];
  const survivors = snap?.crew.filter((c) => c.alive) ?? [];

  return (
    <div className="grid h-full place-items-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GlassPanel
        className="w-full max-w-md p-6"
        motionProps={{
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 },
        }}
      >
        <motion.h1
          className="font-display text-3xl font-bold tracking-[0.2em]"
          style={{ color: "var(--color-alert)" }}
          initial={{ letterSpacing: "0.4em", opacity: 0 }}
          animate={{ letterSpacing: "0.2em", opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          EXPEDITION LOST
        </motion.h1>
        <p className="mt-2 text-sm leading-relaxed text-mars-sand/80">
          {snap?.reason || "The trail claimed the rover before it reached Korolev."}
        </p>
        <p className="mt-1 font-mono text-xs text-mars-sand/55">Sol {sol}</p>

        <div className="mt-5 space-y-1.5">
          {lost.map((c) => (
            <p key={c.id} className="font-display text-sm tracking-wide text-mars-sand/85">
              {crewName(c.id)} succumbed
              {c.condition && c.condition !== "healthy" ? ` to ${c.condition}` : ""}, Sol {sol}.
            </p>
          ))}
          {survivors.map((c) => (
            <p key={c.id} className="font-display text-sm tracking-wide text-mars-sand/55">
              {crewName(c.id)} — survived, stranded.
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo("boot")}
          className="mt-6 min-h-[44px] w-full rounded border border-[var(--color-ui-border)] bg-[rgba(255,90,60,0.1)] px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-mars-sand transition-colors hover:text-mars-dust"
        >
          New Expedition
        </button>
      </GlassPanel>
    </div>
  );
}
