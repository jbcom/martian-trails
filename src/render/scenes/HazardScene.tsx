import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { MarsLighting } from "@/render/camera";
import { run } from "@/sim/run";

/**
 * The rover nosing up to the hazard terrain feature, the signature tension beat
 * (GAME-DESIGN.md §5 M5). A curated PSX rock cliff (terrain/rocks.glb) walls off the
 * far side of the frame — the impassable Mars terrain — and the rover sits at its lip,
 * facing it. Once the traverse resolves, the rover eases forward toward the wall (the
 * "crosses it" motion) so the consequence reads physically.
 *
 * Side-3D framing reuses the shared MarsLighting + Sky + Ground so the world is
 * continuous with the travel leg. NO placeholder geometry — the cliff is a real GLB.
 */
function ApproachingRover() {
  const ref = useRef<Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    // Idle suspension settle while the player decides; once the hazard is resolved
    // (no longer pending) the rover creeps forward toward the wall — the crossing.
    const resolved = run.currentHazard == null;
    const targetX = resolved ? 1.2 : -2.2;
    g.position.x += (targetX - g.position.x) * Math.min(1, delta * 1.2);
    g.position.y = Math.abs(Math.sin(t.current * 1.5)) * 0.02;
    g.rotation.z = Math.sin(t.current * 0.6) * 0.006;
  });

  return (
    <group ref={ref} position={[-2.2, 0, 0]}>
      <Model url={MODELS.rover} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.6} />
    </group>
  );
}

/**
 * The impassable terrain wall — the curated PSX rock cliff, kitbashed from several
 * scaled/rotated instances into a continuous craggy barrier across the far side of
 * the frame (the "read" the player squints at). Set back on +X / −Z so the rover and
 * the obstacle both read in the ortho frame.
 */
function HazardTerrain() {
  return (
    <group position={[6.5, 0, -1.5]}>
      {/* Main cliff mass, tall and close. */}
      <Model url={MODELS.rocks} position={[0, 0, 0]} rotation={[0, 0.4, 0]} scale={5.5} />
      {/* Flanking outcrops to extend the barrier across the frame depth. */}
      <Model url={MODELS.rocks} position={[2.5, 0, -3]} rotation={[0, -1.1, 0]} scale={4} />
      <Model url={MODELS.rocks} position={[-1, 0, 4]} rotation={[0, 2.2, 0]} scale={3.2} />
      {/* Foreground rubble at the rover's wheels — the lip of the hazard. */}
      <Model url={MODELS.rocks} position={[-4, 0, 4.5]} rotation={[0, 1.5, 0]} scale={1.3} />
    </group>
  );
}

export function HazardScene() {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground />
      <HazardTerrain />
      <ApproachingRover />
    </Suspense>
  );
}
