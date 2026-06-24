import { getSponsor } from "@/content/sponsors";
import type { HighScore } from "@/platform/persistence";
import { GlassPanel } from "@/ui/components/GlassPanel";

/** Sponsor display name from the roster, falling back to the raw id. */
function sponsorName(id: string): string {
  return getSponsor(id)?.name ?? id;
}

/**
 * Hall of Records — the high-score board (m7). Lists the top UNOMA ratings with their sponsor,
 * survivors, and Sol, newest-best first. Renders an empty-state line when no run has been
 * banked yet ("No expeditions on record"). Shown on the boot menu and the terminus screen.
 */
export function HallOfRecords({
  scores,
  className = "",
}: {
  scores: readonly HighScore[];
  className?: string;
}) {
  return (
    <GlassPanel className={`w-full p-5 ${className}`}>
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-mars-dust">
        Hall of Records
      </p>
      {scores.length === 0 ? (
        <p className="mt-3 font-display text-xs uppercase tracking-[0.2em] text-mars-sand/50">
          No expeditions on record — be the first to reach Korolev.
        </p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {scores.map((s, i) => (
            <li
              key={`${s.seed}-${s.date}-${i}`}
              className="flex items-baseline justify-between gap-3 border-b border-[var(--color-ui-border)]/30 pb-1.5"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="w-5 font-mono text-xs tabular-nums text-mars-dust/80">
                  {i + 1}.
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm tracking-wide text-mars-sand">
                    {sponsorName(s.sponsorId)}
                  </span>
                  <span className="font-mono text-[0.6rem] text-mars-sand/50">
                    {s.survivors} survived · Sol {s.sol}
                  </span>
                </span>
              </span>
              <span className="shrink-0 font-mono text-base tabular-nums text-mars-dust">
                {s.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </GlassPanel>
  );
}
