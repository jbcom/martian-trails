import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

interface ModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Uniform scale or per-axis scale for modular kit pieces. */
  scale?: number | [number, number, number];
}

/**
 * Renders a curated GLB with PSX-era material treatment: nearest-neighbour
 * texture filtering (the chunky, unfiltered PS1 look) and disabled mipmaps so
 * low-res textures stay crisp at any zoom. Each instance gets a cloned scene so
 * the same model can appear multiple times without sharing transforms.
 */
export function Model({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: ModelProps) {
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    // SkeletonUtils.clone preserves SkinnedMesh<->bone bindings; a plain
    // Object3D.clone() leaves rigged GLBs (the astronaut) unbound and invisible.
    const root = cloneSkeleton(scene);
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
          mat.map.magFilter = THREE.NearestFilter;
          mat.map.minFilter = THREE.NearestFilter;
          mat.map.generateMipmaps = false;
          mat.map.needsUpdate = true;
        }
      }
    });
    return root;
  }, [scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}
