import { GameCanvas } from "@/render/GameCanvas";
import { Router } from "@/ui/Router";
import { useSettingsSync } from "@/ui/useSettingsSync";

/**
 * Application shell. Mounts the R3F render layer (GameCanvas — side-3D ortho scene
 * selected by the current screen) with the DOM screen router (Router) layered on
 * top. Both read the active screen from the store; per-frame sim data flows to the
 * scenes via the diagnostics bridge. See docs/ARCHITECTURE.md.
 *
 * No placeholder geometry — every surface is a real curated PSX asset, the meshy
 * rover, or a real generated regolith texture (docs/ART-DIRECTION.md: zero
 * procedural stand-ins).
 */
export function App() {
  // Keep the audio-mute + haptics subsystems in lockstep with the store settings.
  useSettingsSync();
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-mars-bg text-mars-sand">
      <GameCanvas />
      <Router />
    </div>
  );
}
