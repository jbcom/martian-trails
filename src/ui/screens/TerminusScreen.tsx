import { motion } from "framer-motion";
import { config } from "@/config";
import { run } from "@/sim/run";
import { computeScore } from "@/sim/systems/scoring";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";

/** Map a final score to a prestige tier (the design's "Areologist First Class" tone). */
function prestigeTier(score: number): string {
  if (score >= 3000) return "Areologist First Class";
  if (score >= 2000) return "Senior Pathfinder";
  if (score >= 1000) return "Trail Marshal";
  return "Provisional Surveyor";
}

/** A labeled score-breakdown row. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--color-ui-border)]/40 py-1.5">
      <span className="font-display text-xs uppercase tracking-[0.15em] text-mars-sand/70">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums text-mars-sand">{value}</span>
    </div>
  );
}

/**
 * Terminus — reached Korolev Crater. Presents the UNOMA Rating with its component
 * breakdown (crew, hoarded resources, Sol penalty) per config.scoring, the prestige
 * tier, survivors and Sols. "New Expedition" returns to boot for a fresh run.
 */
export function TerminusScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const snap = run.snapshot();

  const res = (snap?.resources ?? null) as {
    oxygen: number;
    water: number;
    rations: number;
  } | null;
  const survivors = snap?.crew.filter((c) => c.alive).length ?? 0;
  const sol = snap?.sol ?? 0;
  const scoreMultiplier = snap?.scoreMultiplier ?? 1;
  const score =
    snap?.score ||
    (res
      ? computeScore({
          survivors,
          oxygen: res.oxygen,
          water: res.water,
          rations: res.rations,
          sol,
          scoreMultiplier,
        })
      : 0);
  const s = config.scoring;
  const resourceBank = res
    ? Math.floor((res.oxygen + res.water + res.rations) / s.resourceDivisor)
    : 0;

  return (
    <div className="grid h-full place-items-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <GlassPanel
        className="w-full max-w-md p-6"
        motionProps={{
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.4 },
        }}
      >
        <p className="font-display text-[0.65rem] uppercase tracking-[0.35em] text-mars-dust">
          Expedition Complete
        </p>
        <h1 className="font-display text-3xl font-bold tracking-wide text-mars-sand">
          KOROLEV CRATER
        </h1>
        <p className="mt-1 text-sm text-mars-sand/75">
          {snap?.reason || "The rover crests the rim. The settlement lights flicker below."}
        </p>

        <motion.div
          className="my-5 text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <p className="font-display text-[0.6rem] uppercase tracking-[0.3em] text-mars-sand/60">
            UNOMA Rating
          </p>
          <p className="font-mono text-5xl font-bold tabular-nums text-mars-dust">{score}</p>
          <p className="mt-1 font-display text-sm uppercase tracking-[0.2em] text-mars-sand">
            {prestigeTier(score)}
          </p>
        </motion.div>

        <Row label={`Base`} value={`${s.base}`} />
        <Row
          label={`Survivors ×${s.perSurvivor}`}
          value={`${survivors} → +${survivors * s.perSurvivor}`}
        />
        <Row label={`Hoarded resources ÷${s.resourceDivisor}`} value={`+${resourceBank}`} />
        <Row label={`Sol penalty ×${s.perSol}`} value={`Sol ${sol} → −${sol * s.perSol}`} />
        <Row label="Sponsor multiplier" value={`×${scoreMultiplier}`} />

        <button
          type="button"
          onClick={() => goTo("boot")}
          className="mt-6 min-h-[44px] w-full rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.12)] px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-mars-sand transition-colors hover:text-mars-dust"
        >
          New Expedition
        </button>
      </GlassPanel>
    </div>
  );
}
