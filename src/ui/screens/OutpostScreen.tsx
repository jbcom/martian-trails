import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { loreFor } from "@/content/lore";
import type { OutpostEffect, TradeOffer } from "@/schemas/outpost";
import { canAfford } from "@/sim/outpost";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";
import { useRun } from "@/ui/useRun";

/** A compact "+120 Water" / "−2 Parts" chip. */
function effectLabel(effect: OutpostEffect): string {
  const sign = effect.delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(effect.delta)} ${effect.target}`;
}

/** The "Rest in Habitat" action card — heal cost/effect summary + the button. */
function RestCard({
  sols,
  effects,
  onRest,
  rested,
}: {
  sols: number;
  effects: readonly OutpostEffect[];
  onRest: () => void;
  rested: boolean;
}) {
  return (
    <div className="rounded border border-[var(--color-ui-border)] p-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm uppercase tracking-[0.15em] text-mars-sand">
          Rest in Habitat
        </p>
        <span className="font-mono text-[0.65rem] text-mars-sand/60">{sols} Sols</span>
      </div>
      <p className="mt-1 flex flex-wrap gap-1.5 font-mono text-[0.6rem] text-mars-sand/65">
        {effects.map((e) => (
          <span
            key={e.target}
            className="rounded bg-black/40 px-1.5 py-0.5"
            style={{ color: e.delta >= 0 ? "var(--color-ok)" : "var(--color-mars-dust)" }}
          >
            {effectLabel(e)}
          </span>
        ))}
      </p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        disabled={rested}
        onClick={onRest}
        className="mt-2 min-h-[44px] w-full rounded border font-display text-sm uppercase tracking-[0.15em] transition-colors disabled:opacity-40"
        style={{
          borderColor: "var(--color-ok)",
          color: "var(--color-ok)",
          background: "rgba(68,255,170,0.08)",
        }}
      >
        {rested ? "Crew Rested" : "Rest & Heal Crew"}
      </motion.button>
    </div>
  );
}

/** One resupply trade row with affordability gating. */
function TradeRow({
  offer,
  affordable,
  onTrade,
}: {
  offer: TradeOffer;
  affordable: boolean;
  onTrade: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      disabled={!affordable}
      onClick={onTrade}
      className="min-h-[44px] rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.08)] px-3 py-2 text-left transition-colors enabled:hover:border-[var(--color-mars-dust)] disabled:opacity-35"
    >
      <span className="font-display text-[0.8rem] tracking-wide text-mars-sand">{offer.label}</span>
    </motion.button>
  );
}

/**
 * Outpost / habitat dock — the Oregon Trail "fort" stop (GAME-DESIGN.md §2 M8). Renders the
 * OutpostScene underneath; over it: the outpost name, the colonist NEWS/LORE (the GenAI "fort
 * news" via loreFor), a "Rest in Habitat" action (heal crew + morale, costs Sols + vitals), a
 * content-driven resupply exchange, and "Back on the Trail" → resume travel. Content-driven —
 * outpost services + lore both come from config/content; no placeholder copy.
 */
export function OutpostScreen() {
  const snap = useRun();
  const goTo = useGameStore((s) => s.goTo);
  const [rested, setRested] = useState(false);

  const stop = snap?.pendingOutpost ?? null;
  const res = (snap?.resources ?? null) as Parameters<typeof canAfford>[1] | null;

  // A deterministic news line for this dock (stable per outpost so re-renders don't flicker it).
  const news = useMemo(() => {
    if (!stop) return "";
    const lines = loreFor(stop.name);
    if (lines.length === 0) return "";
    // Index by the outpost's km so the same dock always shows the same line.
    return lines[stop.distance % lines.length];
  }, [stop]);

  function rest() {
    run.restAtOutpost();
    setRested(true);
  }

  function trade(offer: TradeOffer) {
    run.tradeAtOutpost(offer);
  }

  function leave() {
    run.leaveOutpost();
    run.setDriving(true);
    goTo("travel");
  }

  // No outpost docked → this screen is a dead-end (deep-link / raced cross-fade). Route back.
  // biome-ignore lint/correctness/useExhaustiveDependencies: route once when truly empty.
  useEffect(() => {
    if (!stop) goTo("travel");
  }, [stop]);

  if (!stop) {
    return (
      <div className="pointer-events-none grid h-full place-items-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-mars-sand/60">
          Docking…
        </p>
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex h-full items-end justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] sm:items-center">
      <GlassPanel
        className="pointer-events-auto flex w-full max-w-lg flex-col gap-3 p-5"
        motionProps={{
          initial: { y: 24, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.25 },
        }}
      >
        <div>
          <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-mars-dust">
            Outpost · {Math.round(stop.distance)} km
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-wide text-mars-sand">
            {stop.name}
          </h2>
        </div>

        {/* Colonist NEWS / LORE — the "talk to colonists" beat (telegraphs the trail ahead). */}
        {news && (
          <div className="rounded border-l-2 border-[var(--color-mars-dust)] bg-black/30 p-3">
            <p className="font-display text-[0.55rem] uppercase tracking-[0.25em] text-mars-dust">
              Colonist News
            </p>
            <p className="mt-1 text-sm italic leading-relaxed text-mars-sand/85">“{news}”</p>
          </div>
        )}

        <RestCard
          sols={stop.service.rest.sols}
          effects={stop.service.rest.effects}
          onRest={rest}
          rested={rested}
        />

        {/* Resupply exchange — content-driven trade offers, affordability-gated. */}
        <div>
          <p className="mb-1.5 font-display text-[0.55rem] uppercase tracking-[0.25em] text-mars-sand/60">
            Local Exchange
          </p>
          <div className="flex flex-col gap-2">
            {stop.service.trades.map((offer) => (
              <TradeRow
                key={offer.id}
                offer={offer}
                affordable={res ? canAfford(offer, res) : false}
                onTrade={() => trade(offer)}
              />
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={leave}
          className="mt-1 min-h-[44px] rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.12)] px-6 py-3 font-display text-sm uppercase tracking-[0.18em] text-mars-sand transition-colors hover:text-mars-dust"
        >
          Back on the Trail
        </motion.button>
      </GlassPanel>
    </div>
  );
}
