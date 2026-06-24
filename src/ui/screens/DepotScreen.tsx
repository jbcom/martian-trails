import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { audio } from "@/audio/engine";
import { config } from "@/config";
import { getSponsor } from "@/content/sponsors";
import { tapLight } from "@/platform/haptics";
import {
  adjust,
  buildLoadout,
  canBuy,
  canBuyUpgrade,
  canSell,
  cartCost,
  cartPayload,
  type DepotState,
  initialDepot,
  missingVitals,
  upgradesCreditCost,
} from "@/sim/loadout";
import { run } from "@/sim/run";
import { clearRun } from "@/state/savegame";
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
  budget,
  onAdjust,
}: {
  itemId: string;
  cart: DepotState;
  budget: number;
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
        disabled={!canBuy(cart, item.id, budget)}
        onClick={() => onAdjust(1)}
        className="grid h-11 w-11 place-items-center rounded border border-[var(--color-ui-border)] font-display text-lg text-mars-sand transition-colors enabled:hover:text-mars-dust disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/** An upgrade row: name, effect, Credit price, and a buy/installed toggle. */
function UpgradeRow({
  upgradeId,
  cart,
  selected,
  budget,
  onToggle,
}: {
  upgradeId: string;
  cart: DepotState;
  selected: string[];
  budget: number;
  onToggle: () => void;
}) {
  const upg = config.upgrades.catalog.find((u) => u.id === upgradeId);
  if (!upg) return null;
  const installed = selected.includes(upg.id);
  const affordable = installed || canBuyUpgrade(cart, selected, upg.id, budget);

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-ui-border)]/40 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm tracking-wide text-mars-sand">{upg.name}</p>
        <p className="font-mono text-[0.6rem] text-mars-sand/55">{upg.desc}</p>
        <p className="font-mono text-[0.6rem] text-mars-sand/45">
          {upg.creditCost.toLocaleString()} CR
        </p>
      </div>
      <button
        type="button"
        aria-label={`${installed ? "Remove" : "Install"} ${upg.name}`}
        disabled={!affordable}
        onClick={onToggle}
        className="min-h-[44px] min-w-[5.5rem] rounded border px-3 font-display text-[0.7rem] uppercase tracking-[0.12em] transition-colors disabled:opacity-30"
        style={{
          borderColor: installed ? "var(--color-ok)" : "var(--color-ui-border)",
          color: installed ? "var(--color-ok)" : "var(--color-mars-sand)",
          background: installed ? "rgba(68,255,170,0.1)" : "transparent",
        }}
      >
        {installed ? "Installed" : "Install"}
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
  const sponsorId = useGameStore((s) => s.sponsorId);
  const sponsor = getSponsor(sponsorId);
  const budget = sponsor?.budget ?? config.store.budget;
  const scoreMultiplier = sponsor?.scoreMultiplier ?? 1;

  const [cart, setCart] = useState<DepotState>(() => initialDepot());
  const [upgrades, setUpgrades] = useState<string[]>([]);

  const payload = useMemo(() => cartPayload(cart), [cart]);
  // Credits remaining = budget − cart cost − the selected upgrades' Credit cost.
  const credits = budget - cartCost(cart) - upgradesCreditCost(upgrades);
  const missing = useMemo(() => missingVitals(cart), [cart]);
  const cap = config.store.payloadCap;

  function toggleUpgrade(id: string) {
    setUpgrades((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  // Budget + vitals are hard launch gates — never depart in an invalid state.
  const canDepart = credits >= 0 && missing.length === 0;

  function depart() {
    if (!canDepart) return;
    void tapLight();
    audio.unlock();
    // A fresh expedition supersedes any stale in-progress save (the autosave then re-arms).
    void clearRun();
    run.start(
      seed ?? `ares-${Date.now().toString(36)}`,
      buildLoadout(cart, upgrades, scoreMultiplier),
    );
    run.setDriving(true);
    goTo("travel");
  }

  return (
    <div className="grid h-full grid-cols-1 tablet:grid-cols-[minmax(0,520px)_1fr] foldable:grid-cols-[minmax(0,620px)_1fr]">
      <GlassPanel
        className="pointer-events-auto m-3 flex flex-col p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pr-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))]"
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
          {sponsor ? `${sponsor.name} · ×${sponsor.scoreMultiplier} score` : "UNOMA Quartermaster"}
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

        {/* The store + rover upgrades — driven entirely by config. Two-column store on
            tablet/foldable (the panel is wide enough there); single-column on phone. */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-x-5 foldable:grid-cols-2">
            {config.store.items.map((item) => (
              <StoreRow
                key={item.id}
                itemId={item.id}
                cart={cart}
                budget={budget}
                onAdjust={(dir) => {
                  if (dir === 1) void tapLight();
                  setCart((c) => adjust(c, item.id, dir, budget));
                }}
              />
            ))}
          </div>

          <p className="mt-4 mb-1 font-display text-[0.6rem] uppercase tracking-[0.25em] text-mars-dust">
            Rover Upgrades
          </p>
          <div className="grid grid-cols-1 gap-x-5 foldable:grid-cols-2">
            {config.upgrades.catalog.map((upg) => (
              <UpgradeRow
                key={upg.id}
                upgradeId={upg.id}
                cart={cart}
                selected={upgrades}
                budget={budget}
                onToggle={() => toggleUpgrade(upg.id)}
              />
            ))}
          </div>
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
          disabled={!canDepart}
          className="mt-4 min-h-[44px] rounded border px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-mars-sand transition-colors hover:text-mars-dust disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-mars-sand"
          style={{
            borderColor: !canDepart ? "var(--color-alert)" : "var(--color-ui-border)",
            background: !canDepart ? "rgba(255,90,60,0.12)" : "rgba(204,112,82,0.12)",
          }}
        >
          {credits < 0 ? "Over Budget" : "Clear Airlock & Depart"}
        </button>
      </GlassPanel>
    </div>
  );
}
