import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { WheelDust } from "@/render/assets/WheelDust";
import { MarsLighting } from "@/render/camera";
import { getDiagnostics } from "@/state/diagnostics";

/**
 * The rover, with a driving bob driven by the frame-cadence diagnostics bridge.
 * When `driving` is true it rocks gently on its suspension and the body lifts a
 * touch; idle, it settles. Reads diagnostics inside useFrame — never the store.
 */
function DrivingRover() {
  const ref = useRef<Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const d = getDiagnostics();
    t.current += delta * (d.driving ? 9 : 1.5);
    const amp = d.driving ? 0.08 : 0.015;
    g.position.y = Math.abs(Math.sin(t.current)) * amp;
    g.rotation.z = Math.sin(t.current * 0.7) * (d.driving ? 0.015 : 0.004);
  });

  return (
    <group ref={ref}>
      <Model url={MODELS.rover} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.6} />
      {/* Fine regolith dust at the wheelbase — sells motion + masks static wheels. */}
      <WheelDust origin={[0.2, 0.05, 0.3]} width={1.8} />
    </group>
  );
}

/**
 * Travel — the rover crossing the regolith trail (Oregon Trail's overland leg).
 * The ground scrolls by `diagnostics.distance`, the sky lerps by `dayCycle`, and
 * the rover bobs by `driving`. The camera holds; the world moves past it, the
 * classic side-scroll trail in 3D.
 */
export function TravelScene() {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground scroll />
      <DrivingRover />
    </Suspense>
  );
}
