import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { getDiagnostics } from "@/state/diagnostics";
import { makeRegolithTexture } from "./regolith";

interface GroundProps {
  /** World width of the regolith slab. */
  width?: number;
  /** World depth of the regolith slab. */
  depth?: number;
  /** World-space slab position; base interiors shift it forward to avoid roofline leaks. */
  position?: [number, number, number];
  /** When true, scrolls the texture by diagnostics.distance to fake trail travel. */
  scroll?: boolean;
}

/**
 * Textured Martian regolith ground — a real generated regolith surface (see
 * regolith.ts), never a flat-colour plane. In the travel scene it scrolls its
 * UVs by the live `diagnostics.distance` inside useFrame so the rover appears to
 * cover ground without moving the camera (the side-scroll trail).
 */
export function Ground({
  width = 60,
  depth = 26,
  position = [0, 0, 0],
  scroll = false,
}: GroundProps) {
  const tex = useMemo(() => {
    const t = makeRegolithTexture();
    t.repeat.set(width / 4, depth / 4);
    return t;
  }, [width, depth]);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!scroll || !matRef.current?.map) return;
    // distance (km) scaled into texture-repeats of scroll; tasteful, not literal.
    matRef.current.map.offset.x = getDiagnostics().distance * 0.08;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial ref={matRef} map={tex} roughness={1} metalness={0} />
    </mesh>
  );
}
