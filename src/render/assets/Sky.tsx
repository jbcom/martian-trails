import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getDiagnostics } from "@/state/diagnostics";
import { colors } from "@/styles/tokens";

/**
 * Mars sky backdrop: a large gradient quad far behind the action that lerps from
 * a dusty butterscotch daytime sky to a deep maroon night using the live
 * `diagnostics.dayCycle`. A vertex-colour gradient (top->horizon) gives the
 * thin-atmosphere haze for free. Reads diagnostics in useFrame; no store churn.
 */
export function Sky() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(colors.marsDust) },
        uHorizon: { value: new THREE.Color(colors.marsRed) },
        uNight: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform float uNight;
        void main() {
          vec3 day = mix(uHorizon, uTop, smoothstep(0.0, 1.0, vUv.y));
          vec3 night = day * 0.18;
          gl_FragColor = vec4(mix(day, night, uNight), 1.0);
        }
      `,
    });
  }, []);

  useFrame(() => {
    if (!matRef.current) return;
    // dayCycle 0..1: dawn(0)->noon(0.5)->dusk(1). Night-ness peaks at the ends.
    const cycle = getDiagnostics().dayCycle;
    const night = Math.min(1, Math.abs(cycle - 0.5) * 2);
    matRef.current.uniforms.uNight.value = night * night;
  });

  return (
    <mesh position={[0, 6, -30]} material={material}>
      <primitive object={material} ref={matRef} attach="material" />
      <planeGeometry args={[120, 60]} />
    </mesh>
  );
}
