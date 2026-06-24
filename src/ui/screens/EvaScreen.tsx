import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { config } from "@/config";
import { tapLight } from "@/platform/haptics";
import { isCarryFull, type ScanHeat } from "@/sim/eva";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";
import { useRun } from "@/ui/useRun";

type Mode = "scan" | "drill";

/** Per-cell visible state the player has uncovered: last heat read, or a found deposit. */
interface CellState {
  heat?: ScanHeat;
  /** True once a scan revealed a deposit exactly here. */
  found?: boolean;
  /** True once drilled dry here. */
  spent?: boolean;
}

const HEAT_COLOR: Record<ScanHeat, string> = {
  hot: "var(--color-alert)",
  warm: "var(--color-mars-dust)",
  cold: "rgba(204,112,82,0.25)",
  none: "rgba(204,112,82,0.1)",
};

/**
 * EVA Prospecting — the hunting equivalent active minigame (GAME-DESIGN.md §5 M6). Over the
 * rendered EvaScene: an O₂ clock (the "ammo" + timer), a scan/drill mode toggle, a tactile
 * grid the player taps to scan (hot/cold toward subsurface deposits) or drill (extract), the
 * running haul vs the carry cap, and a Return-to-rover that banks the haul. Mobile-first,
 * touch-sized cells, Mars tokens.
 */
export function EvaScreen() {
  const snap = useRun();
  const goTo = useGameStore((s) => s.goTo);
  const [mode, setMode] = useState<Mode>("scan");
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const eva = snap?.eva ?? null;

  // Start an EVA on entry if one isn't live (the travel screen kicks it off, but a deep-link
  // onto "eva" should still spin one up rather than dead-end).
  useEffect(() => {
    if (!run.currentEva) run.startEva();
  }, []);

  const cfg = config.eva;
  const gridSize = eva?.gridSize ?? cfg.gridSize;
  const o2 = eva?.o2 ?? 0;
  const o2Max = cfg.o2Budget;
  const haul = eva?.haul ?? { water: 0, parts: 0, score: 0, mass: 0, drills: 0 };
  const carryPct = Math.min(100, (haul.mass / cfg.carryCap) * 100);
  const carryFull = eva ? isCarryFull(eva) : false;
  const lowO2 = o2 <= cfg.injuryO2Threshold;
  const outOfAir = o2 <= 0 || (eva?.ended ?? false);

  function tap(x: number, y: number) {
    if (!run.currentEva || outOfAir) return;
    const key = `${x},${y}`;
    if (mode === "scan") {
      const heat = run.evaScan(x, y);
      setCells((c) => ({ ...c, [key]: { ...c[key], heat } }));
      if (heat === "hot") setFlash("Deposit nearby — switch to Drill");
    } else {
      void tapLight();
      const hit = run.evaDrill(x, y);
      setCells((c) => ({
        ...c,
        [key]: { ...c[key], found: hit, spent: !hit ? c[key]?.spent : c[key]?.spent },
      }));
      setFlash(hit ? "Struck a deposit — haul banked" : "Dry — burned O₂ for nothing");
    }
  }

  function bankAndReturn() {
    run.endEva();
    goTo("travel");
  }

  const o2State =
    o2 <= cfg.injuryO2Threshold ? "critical" : o2 <= o2Max * 0.5 ? "warning" : "nominal";
  const o2Color =
    o2State === "critical"
      ? "var(--color-alert)"
      : o2State === "warning"
        ? "var(--color-mars-dust)"
        : "var(--color-ok)";

  return (
    <div className="pointer-events-none flex h-full flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
      {/* Top: O₂ clock + haul tally. */}
      <GlassPanel
        className="pointer-events-auto p-3"
        motionProps={{ initial: { y: -16, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-[0.25em] text-mars-dust">
            EVA Prospecting
          </span>
          <span className="font-mono text-xs tabular-nums" style={{ color: o2Color }}>
            O₂ {Math.round(o2)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-[var(--color-ui-border)]">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: o2Color }}
            animate={{ width: `${Math.max(0, (o2 / o2Max) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 font-mono text-[0.65rem] text-mars-sand/75">
          <span className="rounded bg-black/40 px-2 py-1">Water {haul.water}</span>
          <span className="rounded bg-black/40 px-2 py-1">Parts {haul.parts}</span>
          <span className="rounded bg-black/40 px-2 py-1">Score {haul.score}</span>
        </div>
        {lowO2 && !outOfAir && (
          <p className="mt-2 font-mono text-[0.65rem] text-[var(--color-alert)]">
            Low O₂ — every action now risks a suit-tear injury. Bank the haul.
          </p>
        )}
      </GlassPanel>

      {/* Middle: the scan/drill grid. */}
      <GlassPanel
        className="pointer-events-auto mx-auto w-full max-w-sm p-3"
        motionProps={{ initial: { scale: 0.96, opacity: 0 }, animate: { scale: 1, opacity: 1 } }}
      >
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, i) => {
            const x = i % gridSize;
            const y = Math.floor(i / gridSize);
            const key = `${x},${y}`;
            const cell = cells[key];
            const bg = cell?.found
              ? "var(--color-ok)"
              : cell?.heat
                ? HEAT_COLOR[cell.heat]
                : "rgba(204,112,82,0.08)";
            return (
              <motion.button
                key={key}
                type="button"
                disabled={outOfAir}
                whileTap={{ scale: 0.9 }}
                onClick={() => tap(x, y)}
                aria-label={`${mode} cell ${x},${y}`}
                className="aspect-square min-h-[36px] rounded-control border border-[var(--color-ui-border)] transition-colors disabled:opacity-40"
                style={{ background: bg }}
              >
                {cell?.found && <span className="font-mono text-[0.6rem] text-black">◆</span>}
              </motion.button>
            );
          })}
        </div>
        <p className="mt-2 text-center font-mono text-[0.6rem] text-mars-sand/55">
          {mode === "scan"
            ? "Tap to sweep the spectrometer — hot = ore near, cold = far."
            : "Tap a hot/found cell to drill it. Each drill costs O₂."}
        </p>
      </GlassPanel>

      {/* Bottom: mode toggle, carry cap, return. */}
      <GlassPanel
        className="pointer-events-auto flex flex-col gap-2 p-3"
        motionProps={{ initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
      >
        {flash && (
          <p className="font-mono text-[0.65rem] leading-snug text-mars-sand/80">{flash}</p>
        )}
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-display text-[0.6rem] uppercase tracking-[0.2em] text-mars-sand/60">
              Carry {carryFull ? "— FULL" : ""}
            </span>
            <span className="font-mono text-[0.65rem] tabular-nums text-mars-sand">
              {Math.round(haul.mass)} / {cfg.carryCap}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/50 ring-1 ring-[var(--color-ui-border)]">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: carryFull ? "var(--color-alert)" : "var(--color-mars-dust)",
              }}
              animate={{ width: `${carryPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex gap-1.5">
          {(["scan", "drill"] as const).map((m) => {
            const on = m === mode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="min-h-[44px] flex-1 rounded border px-2 py-1.5 font-display text-[0.7rem] uppercase tracking-[0.12em] transition-colors"
                style={{
                  borderColor: on ? "var(--color-mars-dust)" : "var(--color-ui-border)",
                  color: on ? "var(--color-mars-dust)" : "var(--color-mars-sand)",
                  background: on ? "rgba(204,112,82,0.16)" : "transparent",
                }}
              >
                {m === "scan" ? "Scan" : "Drill"}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={bankAndReturn}
          className="min-h-[44px] rounded border font-display text-sm uppercase tracking-[0.18em] transition-colors"
          style={{
            borderColor: "var(--color-ok)",
            color: "var(--color-ok)",
            background: "rgba(68,255,170,0.08)",
          }}
        >
          {outOfAir ? "O₂ Out — Return to Rover" : "Return to Rover"}
        </button>
      </GlassPanel>
    </div>
  );
}
