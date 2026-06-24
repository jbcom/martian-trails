import { motion } from "framer-motion";
import type { Effect, TrailEvent } from "@/schemas/event";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";

/** One word summary of an effect for the option preview, e.g. "−15 power". */
function effectLabel(effect: Effect): string {
  const sign = effect.delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(effect.delta)} ${effect.target}`;
}

/**
 * Trail-event decision modal. Shown while the run controller has a pending event
 * (the rover is halted). Renders the event title/description from the content
 * registry and its 2–4 options; choosing one applies the option's effects to the
 * sim (run.applyEventChoice), resumes driving, and returns to the travel HUD.
 *
 * Used both as the routed "event" screen (via run.currentEvent) and inline by the
 * travel HUD; the `event` prop wins when supplied.
 */
export function EventModal({ event }: { event?: TrailEvent }) {
  const goTo = useGameStore((s) => s.goTo);
  const trailEvent = event ?? run.currentEvent;
  if (!trailEvent) return null;

  function choose(effects: readonly Effect[]) {
    run.applyEventChoice(effects);
    run.setDriving(true);
    goTo("travel");
  }

  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-black/60 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GlassPanel
        className="w-full max-w-lg p-5"
        motionProps={{
          initial: { scale: 0.92, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.92, opacity: 0 },
          transition: { duration: 0.2 },
        }}
      >
        <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-mars-dust">
          Trail Event
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-wide text-mars-sand">
          {trailEvent.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mars-sand/80">{trailEvent.description}</p>

        <div className="mt-4 flex flex-col gap-2">
          {trailEvent.options.map((opt) => (
            <motion.button
              key={opt.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => choose(opt.effects)}
              className="min-h-[44px] rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.08)] px-4 py-2.5 text-left transition-colors hover:border-[var(--color-mars-dust)]"
            >
              <span className="block font-display text-sm tracking-wide text-mars-sand">
                {opt.label}
              </span>
              <span className="mt-0.5 block font-mono text-[0.65rem] text-mars-sand/55">
                {opt.effects.map(effectLabel).join("  ·  ")}
              </span>
            </motion.button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
