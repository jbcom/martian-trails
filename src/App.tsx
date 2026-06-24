import { OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

/**
 * Boot shell. Proves the React + R3F + Three (ortho side-view) toolchain renders
 * end to end. The real screen router (depot/travel/hazard/eva/outpost/terminus)
 * is built on this in Milestone 3 — see docs/ARCHITECTURE.md.
 */
export function App() {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-mars-bg text-mars-sand">
      <Canvas className="absolute inset-0">
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} />
        {/* Placeholder regolith plane — replaced by curated GLB scenes in M3/M6. */}
        <mesh rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[40, 24]} />
          <meshStandardMaterial color="#8a3324" />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[2, 1, 1]} />
          <meshStandardMaterial color="#cc7052" />
        </mesh>
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
