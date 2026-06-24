import { Suspense } from "react";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { MarsLighting } from "@/render/camera";

/**
 * Underhill Depot — the garage/airlock staging scene (Oregon Trail's outfitting
 * store). The pressurized rover sits parked on the regolith, flanked by outpost
 * machinery and pipework, with a crew astronaut standing by. Side-3D framing.
 *
 * Scale values were tuned against the curated PSX GLB bounds (rover ~12u long /
 * ~3u tall raw, astronaut ~2u tall raw) so everything reads at a believable
 * relative size in the ortho frame — the rover dwarfs the crew member, props
 * sit waist-high.
 */
export function DepotScene() {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground />

      {/* Hero rover (meshy Mars rover), parked facing right (direction of travel). */}
      <Model url={MODELS.rover} position={[-1.5, 0, 0]} rotation={[0, 0, 0]} scale={3.5} />

      {/* Outpost generator + secondary machinery, set back behind the rover. */}
      <Model url={MODELS.machinery3} position={[6.5, 0, -3]} rotation={[0, -0.4, 0]} scale={0.7} />
      <Model url={MODELS.machinery1} position={[9.5, 0, -2]} rotation={[0, -0.9, 0]} scale={0.7} />

      {/* Plumbing dressing in the foreground. */}
      <Model url={MODELS.pipe} position={[3, 0, 3.5]} rotation={[0, 0.2, 0]} scale={0.9} />
      <Model url={MODELS.valve} position={[5, 0, 3.2]} scale={0.9} />

      {/* Crew member by the airlock side, foreground-left. */}
      <Model url={MODELS.astronaut} position={[-5, 0, 4]} rotation={[0, 0.5, 0]} scale={0.7} />
    </Suspense>
  );
}
