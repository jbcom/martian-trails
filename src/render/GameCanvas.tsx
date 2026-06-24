import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useEffect } from "react";
import type { Screen } from "@/core/screens";
import { preloadModels } from "@/render/assets/models";
import { SideCamera } from "@/render/camera";
import { DepotScene } from "@/render/scenes/DepotScene";
import { TravelScene } from "@/render/scenes/TravelScene";
import { useGameStore } from "@/state/store";
import { colors } from "@/styles/tokens";

/**
 * Maps the active screen (UI cadence, from the zustand store) to its R3F scene.
 * Each screen owns its own scene — never one `update()` gated by an enum — which
 * is the structural fix for the POC's depot-renders-black regression
 * (docs/ARCHITECTURE.md §3). Screens without a bespoke 3D scene yet fall back to
 * the depot staging so the canvas is never blank.
 */
function SceneForScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case "travel":
    case "event":
      return <TravelScene />;
    default:
      return <DepotScene />;
  }
}

/**
 * Mounts the single R3F <Canvas>: the side-3D ortho camera, the screen's scene,
 * and a tasteful PSX-mood postprocessing stack (subtle bloom on the warm key
 * light, a soft vignette, and a faint grain for the PS1 feel). The canvas reads
 * the current screen from the store (human cadence); per-frame sim data flows to
 * the scenes through the diagnostics bridge, not here.
 */
export function GameCanvas() {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    preloadModels();
  }, []);

  return (
    <Canvas
      className="absolute inset-0"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: false }}
      style={{ background: colors.marsBg }}
    >
      <SideCamera />
      <SceneForScreen screen={screen} />
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.65} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
        <Noise opacity={0.06} />
      </EffectComposer>
    </Canvas>
  );
}
