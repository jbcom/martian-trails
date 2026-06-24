import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { MarsLighting } from "@/render/camera";

/**
 * The EVA prospecting site — the hero astronaut (crew/astronaut.glb) out on the Mars
 * surface among scattered rock deposits (terrain/rocks.glb), the active-minigame beat
 * (GAME-DESIGN.md §5 M6). Side-3D framing reuses the shared lighting/sky/ground so the
 * site is continuous with the rest of the trail. The astronaut bobs gently (suit
 * idle); the HUD over this scene (EvaScreen) drives the scan/drill interaction.
 * NO placeholder geometry — both actors are real curated GLBs.
 */
function ProspectingAstronaut() {
  const ref = useRef<Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    // A gentle suit-idle sway so the prospector reads as alive, not a static prop.
    g.position.y = Math.abs(Math.sin(t.current * 1.2)) * 0.03;
    g.rotation.y = Math.PI * 0.15 + Math.sin(t.current * 0.4) * 0.05;
  });

  return (
    <group ref={ref} position={[-3.5, 0, 3]}>
      <Model url={MODELS.astronaut} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={1} />
    </group>
  );
}

/** Scattered prospecting rocks across the site — the deposits the player scans/drills. */
function DepositField() {
  return (
    <group>
      <Model url={MODELS.rocks} position={[2, 0, -1]} rotation={[0, 0.6, 0]} scale={2.2} />
      <Model url={MODELS.rocks} position={[5.5, 0, 2]} rotation={[0, -1.4, 0]} scale={1.6} />
      <Model url={MODELS.rocks} position={[-1, 0, -3]} rotation={[0, 2.5, 0]} scale={1.9} />
      <Model url={MODELS.rocks} position={[4, 0, -4]} rotation={[0, 1.1, 0]} scale={1.3} />
      <Model url={MODELS.rocks} position={[-5, 0, 5]} rotation={[0, 0.3, 0]} scale={1.1} />
    </group>
  );
}

export function EvaScene() {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground />
      <DepositField />
      <ProspectingAstronaut />
    </Suspense>
  );
}
