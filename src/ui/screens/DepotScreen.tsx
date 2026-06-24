import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { audio } from "@/audio/engine";
import { config } from "@/config";
import {
  adjust,
  buildLoadout,
  canBuy,
  canSell,
  cartPayload,
  creditsLeft,
  type DepotState,
  initialDepot,
  missingVitals,
} from "@/sim/loadout";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";

/** Approx Sols a vital pool lasts the crew at filling rations (forecast hint). */
function lastsForSols(itemId: string, qty: number): number | null {
  const crew = config.crew.roster.length;
  const drain = config.resources.drainPerCrew;
  const perSol: Record<string, number> = {
    oxygen: drain.oxygen * crew,
    water: drain.water * crew,
    rations: drain.rations * crew,
  };
  const rate = perSol[itemId];
  if (!rate) return null;
  return Math.floor(qty / rate);
}

/** A single store row: name, price, qty, forecast, and ± controls (≥44px targets). */
function StoreRow({
  itemId,
  cart,
  onAdjust,
}: {
  itemId: string;
  cart: DepotState;
  onAdjust: (dir: 1 | -1) => void;
}) {
  const item = config.store.items.find((i) => i.id === itemId);
  if (!item) return null;
  const qty = cart[item.id] ?? 0;
  const sols = lastsForSols(item.id, qty);

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-ui-border)]/40 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm tracking-wide text-mars-sand">{item.name}</p>
        <p className="font-mono text-[0.65rem] text-mars-sand/55">
          {item.price} CR{item.isBulk ? "/unit" : " ea"}
          {sols != null && qty > 0 ? ` · ~${sols} Sols` : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Sell ${item.name}`}
        disabled={!canSell(cart, item.id)}
        onClick={() => onAdjust(-1)}
        className="grid h-11 w-11 place-items-center rounded border border-[var(--color-ui-border)] font-display text-lg text-mars-sand transition-colors enabled:hover:text-mars-dust disabled:opacity-30"
      >
        −
      </button>
      <span className="w-12 text-center font-mono text-sm tabular-nums text-mars-sand">{qty}</span>
      <button
        type="button"
        aria-label={`Buy ${item.name}`}
        disabled={!canBuy(cart, item.id)}
        onClick={() => onAdjust(1)}
        className="grid h-11 w-11 place-items-center rounded border border-[var(--color-ui-border)] font-display text-lg text-mars-sand transition-colors enabled:hover:text-mars-dust disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/**
 * Underhill Depot — the real provisioning store (m5-2). A single `DepotState` cart
 * is the source of truth; cost, payload, and the spawn loadout all derive from it
 * (no dual-mutation). Budget + the 1000 kg payload cap are both enforced at the
 * control level. "Clear Airlock & Depart" builds the loadout, starts the run, and
 * hands off to travel. Renders over the garage scene (the diegetic boot).
 */
export function DepotScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const seed = useGameStore((s) => s.seed);
  const [cart, setCart] = useState<DepotState>(() => initialDepot());

  const payload = useMemo(() => cartPayload(cart), [cart]);
  const credits = creditsLeft(cart);
  const missing = useMemo(() => missingVitals(cart), [cart]);
  const budget = config.store.budget;
  const cap = config.store.payloadCap;

  function depart() {
    audio.unlock();
    run.start(seed ?? `ares-${Date.now().toString(36)}`, buildLoadout(cart));
    run.setDriving(true);
    goTo("travel");
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(0,460px)_1fr]">
      <GlassPanel
        className="pointer-events-auto m-3 flex flex-col p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        motionProps={{
          initial: { x: -24, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          transition: { duration: 0.3 },
        }}
      >
        <p className="font-display text-xs tracking-[0.4em] text-mars-dust">MARTIAN TRAIL</p>
        <h2 className="font-display text-2xl font-bold tracking-wide text-mars-sand">
          UNDERHILL DEPOT
        </h2>
        <p className="text-xs uppercase tracking-widest text-mars-sand/60">
          UNOMA Quartermaster Interface
        </p>

        {/* Budget + payload meters — both enforced constraints, shown live. */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded border border-[var(--color-ui-border)] p-2">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.2em] text-mars-sand/60">
              Credits
            </p>
            <p
              className="font-mono text-lg tabular-nums"
              style={{ color: credits < 0 ? "var(--color-alert)" : "var(--color-ok)" }}
            >
              {credits.toLocaleString()}
            </p>
            <p className="font-mono text-[0.6rem] text-mars-sand/45">
              of {budget.toLocaleString()} CR
            </p>
          </div>
          <div className="rounded border border-[var(--color-ui-border)] p-2">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.2em] text-mars-sand/60">
              Payload
            </p>
            <p className="font-mono text-lg tabular-nums text-mars-sand">{payload}</p>
            <p className="font-mono text-[0.6rem] text-mars-sand/45">of {cap} cap</p>
          </div>
        </div>

        {/* The store — driven entirely by config.store.items. */}
        <div className="mt-4 flex-1 overflow-y-auto">
          {config.store.items.map((item) => (
            <StoreRow
              key={item.id}
              itemId={item.id}
              cart={cart}
              onAdjust={(dir) => setCart((c) => adjust(c, item.id, dir))}
            />
          ))}
        </div>

        {missing.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 font-display text-xs uppercase tracking-[0.15em]"
            style={{ color: "var(--color-alert)" }}
          >
            ⚠ No {missing.join(", ")} loaded — crew will not survive the trail.
          </motion.p>
        )}

        <button
          type="button"
          onClick={depart}
          className="mt-4 min-h-[44px] rounded border px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-mars-sand transition-colors hover:text-mars-dust"
          style={{
            borderColor: missing.length > 0 ? "var(--color-alert)" : "var(--color-ui-border)",
            background: missing.length > 0 ? "rgba(255,90,60,0.12)" : "rgba(204,112,82,0.12)",
          }}
        >
          Clear Airlock &amp; Depart
        </button>
      </GlassPanel>
    </div>
  );
}
