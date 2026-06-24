import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { MarsLighting } from "@/render/camera";
import { getDiagnostics } from "@/state/diagnostics";

/**
 * Encounter scene — the diegetic NPC hail on the open trail (M8). The rover is
 * parked mid-trail; a trader astronaut NPC approaches from off-screen and halts at
 * the dock point. Position is driven by the encounterAI brain via the diagnostics
 * bridge (enc.x/y/z) so the R3F layer is pure-visual and never touches the sim.
 * Reuses the same lighting/sky/ground as TravelScene — the encounter is continuous
 * with the trail, not a cut-to-black scene change.
 */

function ParkedRover() {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    // Faint idle settle — parked + waiting.
    g.position.y = Math.abs(Math.sin(t.current * 1.2)) * 0.01;
  });
  return (
    <group ref={ref} position={[-3, 0, 1]}>
      <Model url={MODELS.rover} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.55} />
    </group>
  );
}

/**
 * The approaching/arrived trader NPC. Position is read from the diagnostics bridge
 * (enc.x/y/z) which the encounterAI brain writes each tick via the Encounter trait.
 * When no encounter is active, the NPC is hidden off-screen.
 */
function TraderNpc() {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const enc = getDiagnostics().encounter;
    if (enc?.active) {
      g.position.set(enc.x, enc.y, enc.z + 3);
      g.visible = true;
    } else {
      g.visible = false;
    }
  });
  return (
    <group ref={ref}>
      <Model url={MODELS.astronaut} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={0.7} />
    </group>
  );
}

export function EncounterScene() {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground />
      <ParkedRover />
      <TraderNpc />
    </Suspense>
  );
}
