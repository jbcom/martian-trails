import { useEffect, useState } from "react";
import { useGameStore } from "@/state/store";

/**
 * The single source of truth for "should we suppress motion?". True when EITHER the OS
 * `prefers-reduced-motion` media query is set OR the in-game `settings.reducedMotion` flag is
 * on. Screen transitions, the alarm vignette pulse, and camera shake all gate on this so the
 * juice is accessibility-aware (docs/DESIGN-SYSTEM.md §Motion).
 */
export function useReducedMotion(): boolean {
  const flag = useGameStore((s) => s.settings.reducedMotion);
  const [prefers, setPrefers] = useState(() => systemPrefersReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefers(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return prefers || flag;
}

/** Synchronous read of the OS reduced-motion preference (safe under SSR / tests). */
export function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
