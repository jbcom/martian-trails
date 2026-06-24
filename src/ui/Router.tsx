import { AnimatePresence, motion } from "framer-motion";
import type { Screen } from "@/core/screens";
import { useGameStore } from "@/state/store";
import { AlarmOverlay } from "@/ui/AlarmOverlay";
import { BootScreen } from "@/ui/screens/BootScreen";
import { DepotScreen } from "@/ui/screens/DepotScreen";
import { EncounterScreen } from "@/ui/screens/EncounterScreen";
import { EvaScreen } from "@/ui/screens/EvaScreen";
import { EventModal } from "@/ui/screens/EventModal";
import { GameOverScreen } from "@/ui/screens/GameOverScreen";
import { HazardScreen } from "@/ui/screens/HazardScreen";
import { OutpostScreen } from "@/ui/screens/OutpostScreen";
import { SponsorScreen } from "@/ui/screens/SponsorScreen";
import { TerminusScreen } from "@/ui/screens/TerminusScreen";
import { TravelScreen } from "@/ui/screens/TravelScreen";
import { useReducedMotion } from "@/ui/useReducedMotion";

/**
 * The DOM/UI screen router. Reads the active screen from the store (human cadence)
 * and renders its overlay UI on top of the R3F canvas, with framer-motion
 * cross-fades. Each screen is its own component — never one enum-gated render.
 * Screens build out across M5; unbuilt ones fall through to a thin placeholder
 * panel (no blank states).
 */
function ScreenForScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case "boot":
      return <BootScreen />;
    case "sponsor":
      return <SponsorScreen />;
    case "depot":
      return <DepotScreen />;
    case "travel":
      return <TravelScreen />;
    case "outpost":
      return <OutpostScreen />;
    case "event":
      return (
        <>
          <TravelScreen />
          <EventModal />
        </>
      );
    case "encounter":
      return <EncounterScreen />;
    case "hazard":
      return <HazardScreen />;
    case "eva":
      return <EvaScreen />;
    case "terminus":
      return <TerminusScreen />;
    case "gameover":
      return <GameOverScreen />;
    default:
      return (
        <div className="pointer-events-none grid h-full place-items-center">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-mars-sand/60">
            {screen}…
          </p>
        </div>
      );
  }
}

/** Coarse screen classes that share a transition feel. */
type ScreenClass = "menu" | "depot" | "run";

function screenClass(screen: Screen): ScreenClass {
  switch (screen) {
    case "boot":
    case "sponsor":
    case "terminus":
    case "gameover":
      return "menu";
    case "depot":
      return "depot";
    default:
      return "run";
  }
}

/** Per-class enter/exit variants — intentional, not a generic fade. Defined once, reused. */
const VARIANTS: Record<
  ScreenClass,
  { initial: Record<string, number>; animate: Record<string, number>; exit: Record<string, number> }
> = {
  // Menu screens: a calm cross-fade with a hair of lift.
  menu: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  // The depot slides in from the airlock side (the diegetic "step into the garage").
  depot: {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -28 },
  },
  // In-run screens punch in slightly — a tense, present feel for the trail beats.
  run: {
    initial: { opacity: 0, scale: 1.015 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.99 },
  },
};

/** A flat fade with no transform, used when reduced-motion is requested. */
const FLAT = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

export function Router() {
  const screen = useGameStore((s) => s.screen);
  const reduced = useReducedMotion();
  const variant = reduced ? FLAT : VARIANTS[screenClass(screen)];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={variant.initial}
          animate={variant.animate}
          exit={variant.exit}
          transition={{ duration: reduced ? 0.12 : 0.25, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <ScreenForScreen screen={screen} />
        </motion.div>
      </AnimatePresence>
      {/* The critical-alarm vignette + klaxon lives above every screen so it reads anywhere. */}
      <AlarmOverlay />
    </>
  );
}
