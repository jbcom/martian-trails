import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { MarsLighting } from "@/render/camera";

/**
 * Outpost / habitat dock — the Oregon Trail "fort" stop (GAME-DESIGN.md §2 M8). The rover is
 * pulled up to a pressurized habitat built from the curated PSX outpost machinery
 * (outpost/machinery_1 + machinery_3 — generators, hangar gear), with a colonist astronaut
 * standing by and plumbing dressing. Side-3D framing reuses the shared lighting/sky/ground so
 * the dock is continuous with the trail. NO placeholder geometry — every prop is a real GLB.
 */

/** The docked rover, easing to a gentle settle (engines off, parked at the habitat). */
function DockedRover() {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    // A faint idle settle on the suspension — parked, not driving.
    g.position.y = Math.abs(Math.sin(t.current * 1.2)) * 0.012;
    g.rotation.z = Math.sin(t.current * 0.5) * 0.004;
  });
  return (
    <group ref={ref} position={[-4, 0, 1]}>
      <Model url={MODELS.rover} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.55} />
    </group>
  );
}

/**
 * The habitat — a cluster of PSX machinery (generators + hangar gear) kitbashed into a
 * pressurized dome/garage across the right of the frame, the structure the rover docks at.
 */
function Habitat() {
  return (
    <group position={[4.5, 0, -1]}>
      {/* Primary generator hall, the tallest mass. */}
      <Model url={MODELS.machinery3} position={[0, 0, 0]} rotation={[0, -0.5, 0]} scale={1.1} />
      {/* Secondary machinery wing, set back. */}
      <Model
        url={MODELS.machinery1}
        position={[3.5, 0, -2.5]}
        rotation={[0, -1.2, 0]}
        scale={1.0}
      />
      {/* Forward machinery flanking the dock approach. */}
      <Model url={MODELS.machinery1} position={[-1.5, 0, 3]} rotation={[0, 1.4, 0]} scale={0.7} />
      {/* Plumbing + valves dressing the airlock. */}
      <Model url={MODELS.pipe} position={[-3, 0, 4]} rotation={[0, 0.3, 0]} scale={0.8} />
      <Model url={MODELS.valve} position={[-1.5, 0, 4.2]} scale={0.8} />
    </group>
  );
}

/** A colonist astronaut standing by at the airlock (the "talk to colonists" beat). */
function Colonist() {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    g.position.y = Math.abs(Math.sin(t.current * 1.1)) * 0.02;
    g.rotation.y = -Math.PI * 0.1 + Math.sin(t.current * 0.4) * 0.05;
  });
  return (
    <group ref={ref} position={[-1, 0, 4.5]}>
      <Model url={MODELS.astronaut} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={0.7} />
    </group>
  );
}

export function OutpostScene() {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground />
      <Habitat />
      <DockedRover />
      <Colonist />
    </Suspense>
  );
}
