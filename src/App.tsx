import { OrthographicCamera, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { colors } from "@/styles/tokens";

const ROVER_URL = `${import.meta.env.BASE_URL}assets/models/rover/rover.glb`;

function Rover() {
  const { scene } = useGLTF(ROVER_URL);
  return <primitive object={scene} position={[0, -0.6, 0]} scale={3.2} />;
}
useGLTF.preload(ROVER_URL);

/**
 * Boot shell. Proves the React + R3F + Three (ortho side-view) toolchain renders
 * end to end with a real curated GLB (the rover). The full screen router
 * (depot/travel/hazard/eva/outpost/terminus) is built on this in Milestone 3 —
 * see docs/ARCHITECTURE.md.
 */
export function App() {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-mars-bg text-mars-sand">
      <Canvas className="absolute inset-0">
        {/* Side view with a slight downward tilt so the regolith reads as ground. */}
        <OrthographicCamera makeDefault position={[2, 2.5, 12]} zoom={90} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        {/* Regolith plane — replaced by curated terrain GLBs in M3/M6. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color={colors.marsRed} />
        </mesh>
        <Suspense fallback={null}>
          <Rover />
        </Suspense>
      </Canvas>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="font-display text-sm tracking-[0.4em] text-mars-dust">MARTIAN TRAIL</p>
        <p className="text-xs uppercase tracking-widest text-mars-sand/70">
          Underhill Depot · UNOMA Expedition
        </p>
      </header>
    </div>
  );
}
