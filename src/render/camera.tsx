import { OrthographicCamera } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrthographicCamera as ThreeOrthoCamera } from "three";
import { colorsHex } from "@/styles/tokens";

/**
 * Side-3D ortho rig. The camera sits off to one side and above, explicitly
 * looking back at a point just above the ground so the regolith reads as ground
 * and props show depth/parallax without perspective foreshortening — the
 * "side-scroller in 3D" framing from docs/ART-DIRECTION.md. `zoom` is the
 * world->pixel scale of the ortho frustum; the modest downward tilt comes from
 * the camera's Y lift plus the lookAt target.
 */
export function SideCamera({ zoom = 42 }: { zoom?: number }) {
  const ref = useRef<ThreeOrthoCamera>(null);

  useEffect(() => {
    // Aim at the scene's visual centre (a touch above the ground plane) so the
    // action sits centred in the frame with a gentle top-down rake.
    ref.current?.lookAt(0, 1.5, 0);
  }, []);

  return (
    <OrthographicCamera
      ref={ref}
      makeDefault
      // Slightly to the +X side, raised for the downward tilt, pulled back on +Z.
      position={[5, 4.5, 18]}
      zoom={zoom}
      near={-100}
      far={200}
    />
  );
}

/**
 * Mars-tone lighting. A warm low-key ambient fill plus a strong amber key light
 * (the low Martian sun) raking across the scene so PSX geometry catches form
 * shadows. Kept deliberately simple — the postprocessing bloom/vignette adds the
 * rest of the mood.
 */
export function MarsLighting() {
  return (
    <>
      <ambientLight intensity={0.55} color={colorsHex.marsDust} />
      <hemisphereLight intensity={0.45} color={colorsHex.marsSand} groundColor={colorsHex.marsBg} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.5}
        color={colorsHex.marsSand}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Cool rim from the far side so silhouettes separate from the sky. */}
      <directionalLight position={[-10, 6, -8]} intensity={0.35} color={colorsHex.marsRed} />
    </>
  );
}
