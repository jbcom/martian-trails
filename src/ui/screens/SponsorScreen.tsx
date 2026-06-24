import { motion } from "framer-motion";
import { allSponsors } from "@/content/sponsors";
import type { Sponsor } from "@/schemas/sponsor";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";

/**
 * Sponsor select — the Oregon Trail profession choice (GAME-DESIGN.md §2 M1). Three rendered
 * mission-charter cards over the live depot scene: each shows the sponsor's provisioning
 * budget, its terminus score multiplier, and a one-line risk/reward blurb. Picking a sponsor
 * sets its budget as the depot's funding and threads its score multiplier into the run, then
 * routes to provisioning. Lower budget ⇒ higher multiplier — the rich-easy vs broke-prestige
 * spine. Content-driven from src/content/sponsors.ts; no hardcoded sponsor copy.
 */
function SponsorCard({
  sponsor,
  index,
  onPick,
}: {
  sponsor: Sponsor;
  index: number;
  onPick: () => void;
}) {
  return (
    <GlassPanel
      className="pointer-events-auto flex min-w-0 flex-1 flex-col p-5"
      motionProps={{
        initial: { y: 24, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { delay: 0.08 * index, duration: 0.3 },
      }}
    >
      <p className="font-display text-[0.6rem] uppercase tracking-[0.3em] text-mars-dust">
        Mission Charter
      </p>
      <h3 className="mt-1 font-display text-xl font-bold tracking-wide text-mars-sand">
        {sponsor.name}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded border border-[var(--color-ui-border)] p-2">
          <p className="font-display text-[0.55rem] uppercase tracking-[0.2em] text-mars-sand/60">
            Budget
          </p>
          <p className="font-mono text-lg tabular-nums text-mars-sand">
            {sponsor.budget.toLocaleString()}
          </p>
          <p className="font-mono text-[0.55rem] text-mars-sand/45">Credits</p>
        </div>
        <div className="rounded border border-[var(--color-ui-border)] p-2">
          <p className="font-display text-[0.55rem] uppercase tracking-[0.2em] text-mars-sand/60">
            Score
          </p>
          <p
            className="font-mono text-lg tabular-nums"
            style={{
              color: sponsor.scoreMultiplier > 1 ? "var(--color-ok)" : "var(--color-mars-sand)",
            }}
          >
            ×{sponsor.scoreMultiplier}
          </p>
          <p className="font-mono text-[0.55rem] text-mars-sand/45">Multiplier</p>
        </div>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-mars-sand/80">{sponsor.blurb}</p>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onPick}
        className="mt-5 min-h-[44px] rounded border border-[var(--color-ui-border)] bg-[rgba(204,112,82,0.12)] px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-mars-sand transition-colors hover:text-mars-dust"
      >
        Accept Charter
      </motion.button>
    </GlassPanel>
  );
}

export function SponsorScreen() {
  const chooseSponsor = useGameStore((s) => s.chooseSponsor);
  const sponsors = allSponsors();

  return (
    <div className="flex h-full flex-col gap-5 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="font-display text-xs tracking-[0.4em] text-mars-dust">MARTIAN TRAIL</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.15em] text-mars-sand">
          CHOOSE YOUR SPONSOR
        </h1>
        <p className="mt-1 font-display text-[0.7rem] uppercase tracking-[0.25em] text-mars-sand/60">
          More funding, easier run · Less funding, greater glory
        </p>
      </motion.div>

      <div className="flex flex-1 flex-col items-stretch justify-center gap-4 overflow-y-auto md:flex-row md:items-stretch">
        {sponsors.map((sponsor, i) => (
          <SponsorCard
            key={sponsor.id}
            sponsor={sponsor}
            index={i}
            onPick={() => chooseSponsor(sponsor.id)}
          />
        ))}
      </div>
    </div>
  );
}
