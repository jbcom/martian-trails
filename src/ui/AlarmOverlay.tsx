import { useEffect, useRef, useState } from "react";
import { audio } from "@/audio/engine";
import { getDiagnostics } from "@/state/diagnostics";
import { useReducedMotion } from "@/ui/useReducedMotion";

/**
 * Critical-alarm overlay (docs/DESIGN-SYSTEM.md §States — Critical). When the sim flags
 * `diagnostics.critical` (O₂≤0 imminent / hull≤0 / morale≤10) a red vignette pulses over the
 * whole frame and the klaxon fires (throttled in the audio engine). Reads the frame-cadence
 * diagnostics bridge on rAF — NOT the store — so it never tanks React; a tiny boolean of React
 * state flips only when the critical edge changes. Reduced-motion → a steady (non-pulsing)
 * vignette and no repeated klaxon.
 */
export function AlarmOverlay() {
  const [critical, setCritical] = useState(false);
  const reduced = useReducedMotion();
  const wasCritical = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const isCritical = getDiagnostics().critical;
      if (isCritical !== wasCritical.current) {
        wasCritical.current = isCritical;
        setCritical(isCritical);
      }
      // Klaxon while critical (the engine throttles it so it doesn't machine-gun).
      if (isCritical && !reduced) audio.playKlaxon();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  if (!critical) return null;

  return (
    <div
      aria-hidden
      data-alarm="critical"
      className={`pointer-events-none absolute inset-0 z-50 ${reduced ? "" : "animate-alarm-pulse"}`}
      style={{
        // A radial red vignette: clear centre, hot alert edges. The keyframes pulse the
        // opacity; reduced-motion holds it steady at a readable level.
        background:
          "radial-gradient(ellipse at center, transparent 45%, rgba(255,90,60,0.34) 100%)",
        boxShadow: "inset 0 0 120px 20px rgba(255,90,60,0.35)",
        opacity: reduced ? 0.85 : undefined,
      }}
    />
  );
}
