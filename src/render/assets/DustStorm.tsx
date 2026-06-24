import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type BufferAttribute, Color, type Points } from "three";
import { getDiagnostics } from "@/state/diagnostics";
import { colorsHex } from "@/styles/tokens";

/**
 * Dust-storm weather VFX — a drifting ochre particle field that sweeps the frame when
 * `diagnostics.weather === "dust_storm"`. Same render-only particle pattern as WheelDust, scaled
 * up to fill the camera's view: a wide sheet of fine regolith blown across the trail, with the
 * whole cloud fading in/out so a storm rolling in/clearing reads. Reads the diagnostics bridge
 * in useFrame (never the store); the sim sets the storm state (src/sim/systems/weather.ts).
 */
const COUNT = 600;
/** World extents the storm sheet fills (wide + tall enough to cover the ortho frame). */
const SPAN_X = 44;
const SPAN_Y = 16;

export function DustStorm() {
  const ref = useRef<Points>(null);
  /** 0..1 eased presence so the storm fades in/out instead of popping. */
  const presence = useRef(0);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Deterministic-enough spread (render-only): hash the index into the field.
      seeds[i * 3] = ((i * 73) % 1000) / 1000; // x base 0..1
      seeds[i * 3 + 1] = ((i * 191) % 1000) / 1000; // y base 0..1
      seeds[i * 3 + 2] = 0.5 + ((i * 37) % 100) / 100; // speed 0.5..1.5
      positions[i * 3] = (seeds[i * 3] - 0.5) * SPAN_X;
      positions[i * 3 + 1] = seeds[i * 3 + 1] * SPAN_Y - 2;
      positions[i * 3 + 2] = ((i * 53) % 100) / 100 - 0.5;
    }
    return { positions, seeds };
  }, []);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const storming = getDiagnostics().weather === "dust_storm";
    // Ease presence toward the target so the sheet rolls in and clears smoothly.
    const target = storming ? 1 : 0;
    presence.current += (target - presence.current) * Math.min(1, delta * 1.5);
    if (presence.current < 0.01) {
      pts.visible = false;
      return;
    }
    pts.visible = true;

    const time = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      const speed = seeds[i * 3 + 2];
      // Dust streams across −x and wraps; a little vertical wobble sells the turbulence.
      const x = (((seeds[i * 3] - time * 0.06 * speed) % 1) + 1) % 1;
      const wobble = Math.sin(time * 1.5 * speed + i) * 0.5;
      attr.setXYZ(
        i,
        (x - 0.5) * SPAN_X,
        seeds[i * 3 + 1] * SPAN_Y - 2 + wobble,
        ((i * 53) % 100) / 100 - 0.5,
      );
    }
    attr.needsUpdate = true;
    const mat = pts.material as { opacity: number };
    mat.opacity = presence.current * (0.32 + Math.sin(time * 3) * 0.05);
  });

  const dustColor = useMemo(() => new Color(colorsHex.marsSand), []);

  return (
    <points ref={ref} visible={false} position={[0, 0, 8]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.32}
        color={dustColor}
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
