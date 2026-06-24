import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { notifyError, tapLight } from "@/platform/haptics";
import type { HazardEffect, HazardOption } from "@/schemas/hazard";
import { type HazardResult, scaledWeight } from "@/sim/hazard";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";
import { useRun } from "@/ui/useRun";

/** A one-word cost chip, e.g. "−3 parts" / "−50 rations". */
function effectLabel(effect: HazardEffect): string {
  const sign = effect.delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(effect.delta)} ${effect.target}`;
}

/**
 * Aggregate an option's *visible* cost line (upfront effects + Sols) and a coarse risk read
 * derived from its worst (fail/partial) outcome share at the current read. The player sees
 * the guaranteed cost and a risk hint that scales with the gauge — the legible modern version
 * of "the river looks deep".
 */
function optionRisk(option: HazardOption, read: number): "safe" | "low" | "moderate" | "high" {
  const weights = option.outcomes.map((o) => scaledWeight(o, read));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const badShare =
    option.outcomes.reduce(
      (sum, o, i) =>
        sum + (o.tier === "fail" ? weights[i] : o.tier === "partial" ? weights[i] * 0.5 : 0),
      0,
    ) / total;
  if (badShare <= 0.001) return "safe";
  if (badShare < 0.15) return "low";
  if (badShare < 0.35) return "moderate";
  return "high";
}

const RISK_COLOR: Record<ReturnType<typeof optionRisk>, string> = {
  safe: "var(--color-ok)",
  low: "var(--color-ok)",
  moderate: "var(--color-mars-dust)",
  high: "var(--color-alert)",
};

const RISK_LABEL: Record<ReturnType<typeof optionRisk>, string> = {
  safe: "No risk",
  low: "Low risk",
  moderate: "Moderate risk",
  high: "High risk",
};

/** The visible "read" instrument — slope / density / thickness as a 0..1 gauge. */
function ReadGauge({ label, read }: { label: string; read: number }) {
  const pct = Math.round(read * 100);
  // A worse read (higher) skews the bar toward alert — the squint-at-it tension cue.
  const color =
    read > 0.66 ? "var(--color-alert)" : read > 0.4 ? "var(--color-mars-dust)" : "var(--color-ok)";
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-mars-sand/70">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-mars-sand">{pct}%</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-black/50 ring-1 ring-[var(--color-ui-border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {/* Instrument tick marks so the gauge reads as a real meter to interpret. */}
        {[25, 50, 75].map((m) => (
          <div
            key={m}
            className="absolute top-0 h-full w-px bg-black/40"
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** The animated consequence card shown after a choice resolves, before resume. */
function ConsequenceCard({ result, onResume }: { result: HazardResult; onResume: () => void }) {
  const tierColor =
    result.tier === "success"
      ? "var(--color-ok)"
      : result.tier === "partial"
        ? "var(--color-mars-dust)"
        : "var(--color-alert)";
  return (
    <motion.div
      key="consequence"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-3"
    >
      <motion.p
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="font-display text-lg font-bold uppercase tracking-[0.18em]"
        style={{ color: tierColor }}
      >
        {result.tier === "success"
          ? "Clean Crossing"
          : result.tier === "partial"
            ? "Through — Just"
            : "Setback"}
      </motion.p>
      <p className="text-sm leading-relaxed text-mars-sand/85">{result.log}</p>
      <div className="flex flex-wrap gap-2 font-mono text-[0.65rem] text-mars-sand/70">
        {Object.entries(result.patch).length > 0 ||
        result.solsCost > 0 ||
        result.distanceDelta !== 0 ? (
          <>
            {result.solsCost > 0 && (
              <span className="rounded bg-black/40 px-2 py-1">+{result.solsCost} Sols</span>
            )}
            {result.distanceDelta !== 0 && (
              <span className="rounded bg-black/40 px-2 py-1">
                {result.distanceDelta > 0 ? "+" : ""}
                {result.distanceDelta} km
              </span>
            )}
          </>
        ) : null}
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onResume}
        className="mt-1 min-h-[44px] rounded border font-display text-sm uppercase tracking-[0.18em]"
        style={{
          borderColor: "var(--color-ok)",
          color: "var(--color-ok)",
          background: "rgba(68,255,170,0.08)",
        }}
      >
        Resume Expedition
      </motion.button>
    </motion.div>
  );
}

/**
 * Hazard Traverse — the river-crossing equivalent decision screen (GAME-DESIGN.md §5 M5).
 * Renders the rendered HazardScene underneath; over it: the hazard name/description, the
 * visible "read" gauge, and the 3–4 approach options with their upfront cost + a read-scaled
 * risk hint. Choosing resolves the traverse (run.resolveHazard), shows the animated
 * consequence, then resumes driving back on the travel HUD.
 */
export function HazardScreen() {
  const snap = useRun();
  const goTo = useGameStore((s) => s.goTo);
  const [result, setResult] = useState<HazardResult | null>(null);

  const hazard = snap?.pendingHazard ?? null;
  const read = snap?.hazardRead ?? 0;

  function choose(optionId: string) {
    const r = run.resolveHazard(optionId);
    if (r) {
      // A failed traverse gets the heavy error buzz; a clean/partial crossing a light tap.
      if (r.tier === "fail") void notifyError();
      else void tapLight();
      setResult(r);
    }
  }

  function resume() {
    run.resumeFromHazard();
    setResult(null);
    run.setDriving(true);
    goTo("travel");
  }

  // No hazard pending and no consequence to show → this screen is a dead-end (e.g. a
  // deep-link, or a resume that raced the cross-fade). Route back to travel so the player
  // is never stranded on the survey placeholder.
  // biome-ignore lint/correctness/useExhaustiveDependencies: route once when truly empty.
  useEffect(() => {
    if (!hazard && !result) goTo("travel");
  }, [hazard, result]);

  if (!hazard && !result) {
    return (
      <div className="pointer-events-none grid h-full place-items-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-mars-sand/60">
          Surveying terrain…
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex h-full items-end justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:items-center">
      <GlassPanel
        className="pointer-events-auto w-full max-w-lg p-5"
        motionProps={{
          initial: { y: 24, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.25 },
        }}
      >
        <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-mars-dust">
          Hazard Traverse
        </p>

        <AnimatePresence mode="wait">
          {result ? (
            <ConsequenceCard key="c" result={result} onResume={resume} />
          ) : hazard ? (
            <motion.div
              key="decision"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="mt-1 font-display text-xl font-bold tracking-wide text-mars-sand">
                {hazard.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mars-sand/80">{hazard.description}</p>

              <ReadGauge label={hazard.readLabel} read={read} />

              <div className="mt-4 flex flex-col gap-2">
                {hazard.options.map((opt) => {
                  const risk = optionRisk(opt, read);
                  const costs = [
                    ...opt.upfront.map(effectLabel),
                    ...(opt.upfrontSols > 0 ? [`−${opt.upfrontSols} Sols`] : []),
                  ];
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => choose(opt.id)}
                      className="min-h-[44px] rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.08)] px-4 py-2.5 text-left transition-colors hover:border-[var(--color-mars-dust)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm tracking-wide text-mars-sand">
                          {opt.label}
                        </span>
                        <span
                          className="shrink-0 font-display text-[0.6rem] uppercase tracking-[0.12em]"
                          style={{ color: RISK_COLOR[risk] }}
                        >
                          {RISK_LABEL[risk]}
                        </span>
                      </div>
                      <span className="mt-0.5 block text-[0.7rem] leading-snug text-mars-sand/65">
                        {opt.blurb}
                      </span>
                      {costs.length > 0 && (
                        <span className="mt-1 block font-mono text-[0.6rem] text-mars-sand/50">
                          {costs.join("  ·  ")}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </GlassPanel>
    </div>
  );
}
