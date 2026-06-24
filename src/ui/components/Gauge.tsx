import { motion } from "framer-motion";

/**
 * A single vitals readout (O₂ / H₂O / Rations / Power / Hull / Morale). Renders a
 * labeled bar that fills to `value/max`, color-coded by the UNOMA gauge states
 * (docs/DESIGN-SYSTEM.md): nominal → ok green, warning → dust pulse, critical →
 * alert red. The numeric uses the mono family so columns of vitals stay aligned.
 */
export type GaugeState = "nominal" | "warning" | "critical";

/** Classify a 0..1 fill into the three gauge states. */
export function gaugeState(ratio: number): GaugeState {
  if (ratio <= 0.15) return "critical";
  if (ratio <= 0.35) return "warning";
  return "nominal";
}

const BAR_COLOR: Record<GaugeState, string> = {
  nominal: "var(--color-ok)",
  warning: "var(--color-mars-dust)",
  critical: "var(--color-alert)",
};

export function Gauge({
  label,
  value,
  max,
  unit = "",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const state = gaugeState(ratio);
  const color = BAR_COLOR[state];

  return (
    <div className="flex flex-col gap-1" data-gauge={label} data-state={state}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[0.65rem] uppercase tracking-[0.2em] text-mars-sand/70">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-mars-sand">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/50 ring-1 ring-[var(--color-ui-border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{
            width: `${ratio * 100}%`,
            opacity: state === "warning" ? [1, 0.55, 1] : 1,
          }}
          transition={{
            width: { duration: 0.4, ease: "easeOut" },
            opacity:
              state === "warning"
                ? { duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                : { duration: 0.2 },
          }}
        />
      </div>
    </div>
  );
}
