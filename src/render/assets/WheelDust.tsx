import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type BufferAttribute, Color, type Points } from "three";
import { getDiagnostics } from "@/state/diagnostics";
import { colorsHex } from "@/styles/tokens";

/**
 * Fine regolith dust kicked up at the rover's base while driving. Sells movement
 * AND masks the static (non-animated) wheels by occluding the bottom ~10% of the
 * vehicle with drifting particles. Reads `diagnostics.driving` in useFrame — the
 * emitter only churns while the rover moves.
 */
const COUNT = 120;

interface DustProps {
  /** Where the wheels meet the ground, in the rover's local space. */
  origin?: [number, number, number];
  /** Horizontal spread of the dust skirt (covers the wheelbase). */
  width?: number;
}

export function WheelDust({ origin = [0, 0, 0], width = 1.6 }: DustProps) {
  const ref = useRef<Points>(null);

  // Per-particle phase/seed so each drifts independently (deterministic-enough
  // for VFX; render-only, not the sim).
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 2] = (i / COUNT) * Math.PI * 2; // phase
      seeds[i * 2 + 1] = 0.4 + ((i * 37) % 100) / 100; // speed/scale
    }
    return { positions, seeds };
  }, []);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const driving = getDiagnostics().driving;
    pts.visible = driving;
    if (!driving) return;

    const time = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const phase = seeds[i * 2];
      const speed = seeds[i * 2 + 1];
      // Dust drifts backward (−x), rises a little, fades outward — a low skirt.
      const life = (time * speed + phase) % 1;
      const x = origin[0] - life * (width * 0.9) - (((i * 13) % 10) / 10) * 0.2;
      const y = origin[1] + life * 0.28 * speed;
      const z = origin[2] + Math.sin(phase + time * 2) * 0.12;
      attr.setXYZ(i, x + (((i * 7) % 10) / 10 - 0.5) * width, y, z);
    }
    attr.needsUpdate = true;
    // Fade the cloud as a whole with a gentle pulse so it reads as billowing.
    const mat = pts.material as { opacity: number };
    mat.opacity = 0.35 + Math.sin(time * 6) * 0.08;
  });

  const dustColor = useMemo(() => new Color(colorsHex.marsDust), []);

  return (
    <points ref={ref} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.18}
        color={dustColor}
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
