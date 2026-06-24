import { AnimatePresence, motion } from "framer-motion";
import type { Screen } from "@/core/screens";
import { useGameStore } from "@/state/store";
import { BootScreen } from "@/ui/screens/BootScreen";
import { DepotScreen } from "@/ui/screens/DepotScreen";
import { EvaScreen } from "@/ui/screens/EvaScreen";
import { EventModal } from "@/ui/screens/EventModal";
import { GameOverScreen } from "@/ui/screens/GameOverScreen";
import { HazardScreen } from "@/ui/screens/HazardScreen";
import { TerminusScreen } from "@/ui/screens/TerminusScreen";
import { TravelScreen } from "@/ui/screens/TravelScreen";

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
    case "depot":
      return <DepotScreen />;
    case "travel":
      return <TravelScreen />;
    case "event":
      return (
        <>
          <TravelScreen />
          <EventModal />
        </>
      );
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

export function Router() {
  const screen = useGameStore((s) => s.screen);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0"
      >
        <ScreenForScreen screen={screen} />
      </motion.div>
    </AnimatePresence>
  );
}
