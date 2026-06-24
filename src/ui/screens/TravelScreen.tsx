import { useState } from "react";
import { config } from "@/config";
import { type RunSnapshot, run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { Gauge } from "@/ui/components/Gauge";
import { GlassPanel } from "@/ui/components/GlassPanel";
import { useRun } from "@/ui/useRun";

/** Portrait URL for a crew id (BASE_URL-aware so it resolves under Pages/Capacitor). */
function portraitUrl(id: string): string {
  return `${import.meta.env.BASE_URL}assets/generated/portraits/${id}.png`;
}

/** A crew portrait that falls back to a silhouette glyph if no generated PNG exists. */
function CrewPortrait({ id, alive }: { id: string; alive: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-ui-border)] bg-black/40"
      style={{ filter: alive ? "none" : "grayscale(1) brightness(0.5)" }}
    >
      {failed ? (
        <span className="font-display text-base text-mars-sand/60" aria-hidden>
          ◓
        </span>
      ) : (
        <img
          src={portraitUrl(id)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/**
 * Bound handle to the run controller's active-ability action. `run.useAbility` is a plain
 * method on the singleton run controller (not a React hook), but its name matches the linter's
 * hook-naming heuristic — the ignore is a true false-positive, not a rules-of-hooks violation.
 */
// biome-ignore lint/correctness/useHookAtTopLevel: run.useAbility is a controller method, not a React hook.
const activateAbility = (crewId: string): boolean => run.useAbility(crewId);

/** Human label for an ability block reason. */
function blockLabel(blocked: "dead" | "cooldown" | "afford" | null, cooldown: number): string {
  if (blocked === "dead") return "Incapacitated";
  if (blocked === "cooldown") return `${cooldown} Sols`;
  if (blocked === "afford") return "Short on resources";
  return "Ready";
}

/**
 * The crew panel — each colonist's portrait + name/role/condition and their active-ability
 * button (M10). The button is disabled if the member is dead, the ability is on cooldown, or
 * the crew can't afford the cost; using it fires run.useAbility. Content-driven from the
 * snapshot's per-crew ability state.
 */
function CrewPanel({ crew }: { crew: RunSnapshot["crew"] }) {
  return (
    <GlassPanel
      className="pointer-events-auto flex w-full flex-col gap-2 p-3 md:w-72"
      motionProps={{ initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
    >
      <p className="font-display text-[0.6rem] uppercase tracking-[0.2em] text-mars-sand/60">
        Crew
      </p>
      {crew.map((c) => {
        const ability = c.ability;
        const usable = ability?.blocked === null;
        return (
          <div key={c.id} className="flex items-center gap-2.5">
            <CrewPortrait id={c.id} alive={c.alive} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[0.75rem] tracking-wide text-mars-sand">
                {c.name}
                <span className="text-mars-sand/45"> · {c.role}</span>
              </p>
              <p
                className="truncate font-mono text-[0.6rem]"
                style={{
                  color:
                    !c.alive || c.condition !== "healthy"
                      ? "var(--color-alert)"
                      : "var(--color-ok)",
                }}
              >
                {!c.alive ? "Lost" : c.condition === "healthy" ? "Healthy" : c.condition}
              </p>
            </div>
            {ability && (
              <button
                type="button"
                title={ability.desc}
                aria-label={`${ability.name}: ${blockLabel(ability.blocked, ability.cooldown)}`}
                disabled={!usable}
                onClick={() => activateAbility(c.id)}
                className="min-h-[44px] shrink-0 rounded border px-2.5 font-display text-[0.62rem] uppercase tracking-[0.08em] transition-colors disabled:opacity-30"
                style={{
                  borderColor: usable ? "var(--color-mars-dust)" : "var(--color-ui-border)",
                  color: usable ? "var(--color-mars-dust)" : "var(--color-mars-sand)",
                  background: usable ? "rgba(204,112,82,0.12)" : "transparent",
                }}
              >
                {ability.name}
                {ability.blocked === "cooldown" ? ` · ${ability.cooldown}` : ""}
              </button>
            )}
          </div>
        );
      })}
    </GlassPanel>
  );
}

/** Human-facing labels for the pace dial, with the design's Δ readout. */
const PACE_OPTIONS = [
  { key: "steady", label: "Steady" },
  { key: "strenuous", label: "Strenuous" },
  { key: "grueling", label: "Grueling" },
] as const;

/** Human-facing labels for the ration dial. */
const RATION_OPTIONS = [
  { key: "filling", label: "Filling" },
  { key: "meager", label: "Meager" },
  { key: "bareBones", label: "Bare Bones" },
] as const;

/** A segmented toggle group (pace / rations) — touch targets ≥44px. */
function Segmented({
  options,
  active,
  onPick,
  hint,
}: {
  options: readonly { key: string; label: string }[];
  active: string;
  onPick: (key: string) => void;
  hint?: (key: string) => string;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const on = opt.key === active;
        return (
          <button
            key={opt.key}
            type="button"
            title={hint?.(opt.key)}
            onClick={() => onPick(opt.key)}
            className="min-h-[44px] flex-1 rounded border px-2 py-1.5 font-display text-[0.7rem] uppercase tracking-[0.12em] transition-colors"
            style={{
              borderColor: on ? "var(--color-mars-dust)" : "var(--color-ui-border)",
              color: on ? "var(--color-mars-dust)" : "var(--color-mars-sand)",
              background: on ? "rgba(204,112,82,0.16)" : "transparent",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** The top progress bar with outpost tick marks (km-based, from terrain config). */
function ProgressBar({ distance, goal }: { distance: number; goal: number }) {
  const pct = Math.max(0, Math.min(100, (distance / goal) * 100));
  return (
    <div className="relative">
      <div className="flex items-baseline justify-between font-mono text-[0.65rem] text-mars-sand/70">
        <span>UNDERHILL</span>
        <span className="tabular-nums text-mars-sand">
          {Math.round(distance)} / {goal} km
        </span>
        <span>KOROLEV</span>
      </div>
      <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-[var(--color-ui-border)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, backgroundColor: "var(--color-mars-dust)" }}
        />
      </div>
      {/* Outpost ticks sit above the rail at their km fraction. */}
      {config.terrain.outposts.map((o) => (
        <div
          key={o.name}
          className="absolute top-[1.05rem] h-2.5 w-px bg-mars-sand/70"
          style={{ left: `${(o.distance / goal) * 100}%` }}
          title={`${o.name} · ${o.distance} km`}
        />
      ))}
    </div>
  );
}

/** Power gauge max comes from the RTG-derived ceiling carried in resources.rtg. */
function powerMax(res: RunSnapshot["resources"]): number {
  const rtg = (res as { rtg?: number })?.rtg ?? 1;
  return Math.max(1, rtg) * config.resources.maxPowerPerRtg;
}

/**
 * Travel HUD over the TravelScene. Reads the run snapshot at UI cadence via useRun
 * (the 3D scene reads the diagnostics bridge directly). Top progress bar with
 * outpost ticks; vitals gauges; Sol counter; pace + ration dials wired through the
 * run controller; a log line; and the drive/halt control. Trail events pause
 * driving and surface the EventModal.
 */
export function TravelScreen() {
  const snap = useRun();
  const goTo = useGameStore((s) => s.goTo);
  if (!snap?.resources) {
    return (
      <div className="grid h-full place-items-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-mars-sand/60">
          Initializing rover…
        </p>
      </div>
    );
  }

  const res = snap.resources as {
    oxygen: number;
    water: number;
    rations: number;
    power: number;
    morale: number;
    hull: number;
    rtg: number;
  };
  const max = config.resources.max;
  const log = snap.driving
    ? `Sol ${snap.sol} — rover underway, ${Math.round(snap.goal - snap.distance)} km to Korolev.`
    : `Sol ${snap.sol} — rover halted at ${Math.round(snap.distance)} km. Awaiting orders.`;

  return (
    <div className="pointer-events-none flex h-full flex-col justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Top: progress + Sol counter. */}
      <GlassPanel
        className="pointer-events-auto p-3"
        motionProps={{ initial: { y: -16, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-[0.25em] text-mars-dust">
            Expedition Telemetry
          </span>
          <span className="font-mono text-xs tabular-nums text-mars-sand">SOL {snap.sol}</span>
        </div>
        <ProgressBar distance={snap.distance} goal={snap.goal} />
      </GlassPanel>

      {/* Bottom cluster: vitals, crew, controls, log. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <CrewPanel crew={snap.crew} />
        <GlassPanel
          className="pointer-events-auto grid flex-1 grid-cols-2 gap-x-4 gap-y-2 p-3 sm:grid-cols-3"
          motionProps={{ initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
        >
          <Gauge label="O₂" value={res.oxygen} max={max.oxygen} />
          <Gauge label="Water" value={res.water} max={max.water} />
          <Gauge label="Rations" value={res.rations} max={max.rations} />
          <Gauge label="Power" value={res.power} max={powerMax(snap.resources)} />
          <Gauge label="Morale" value={res.morale} max={max.morale} />
          <Gauge label="Hull" value={res.hull} max={max.hull} />
        </GlassPanel>

        <GlassPanel
          className="pointer-events-auto flex w-full flex-col gap-2 p-3 md:w-72"
          motionProps={{ initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
        >
          <div>
            <p className="mb-1 font-display text-[0.6rem] uppercase tracking-[0.2em] text-mars-sand/60">
              Pace
            </p>
            <Segmented
              options={PACE_OPTIONS}
              active={snap.pace}
              onPick={(k) => run.setPace(k)}
              hint={(k) => {
                const p = config.travel.pace[k];
                return p ? `×${p.speedMult} km · event ${Math.round(p.eventChance * 100)}%` : "";
              }}
            />
          </div>
          <div>
            <p className="mb-1 font-display text-[0.6rem] uppercase tracking-[0.2em] text-mars-sand/60">
              Rations
            </p>
            <Segmented
              options={RATION_OPTIONS}
              active={snap.rationLevel}
              onPick={(k) => run.setRations(k)}
              hint={(k) => {
                const r = config.travel.rations[k];
                return r ? `×${r.consumptionMult} food · −${r.moralePenalty} morale` : "";
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => run.setDriving(!snap.driving)}
            className="mt-1 min-h-[44px] rounded border font-display text-sm uppercase tracking-[0.18em] transition-colors"
            style={{
              borderColor: snap.driving ? "var(--color-alert)" : "var(--color-ok)",
              color: snap.driving ? "var(--color-alert)" : "var(--color-ok)",
              background: snap.driving ? "rgba(255,90,60,0.1)" : "rgba(68,255,170,0.08)",
            }}
          >
            {snap.driving ? "Halt Rover" : "Drive"}
          </button>
          {/* EVA prospecting is available only while halted (suit up off the move). */}
          {!snap.driving && (
            <button
              type="button"
              onClick={() => {
                run.startEva();
                goTo("eva");
              }}
              className="min-h-[44px] rounded border font-display text-sm uppercase tracking-[0.18em] transition-colors"
              style={{
                borderColor: "var(--color-mars-dust)",
                color: "var(--color-mars-dust)",
                background: "rgba(204,112,82,0.1)",
              }}
            >
              Prospect (EVA)
            </button>
          )}
          <p className="font-mono text-[0.65rem] leading-snug text-mars-sand/70">{log}</p>
        </GlassPanel>
      </div>
    </div>
  );
}
