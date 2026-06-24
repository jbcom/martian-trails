import { useFrame } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Ground } from "@/render/assets/Ground";
import { Model } from "@/render/assets/Model";
import { MODELS } from "@/render/assets/models";
import { Sky } from "@/render/assets/Sky";
import { MarsLighting } from "@/render/camera";

export type BaseInteriorVariant = "underhill" | "outpost" | "korolev";

type Vec3 = [number, number, number];

const floorModules: { position: Vec3; model: string }[] = [
  { position: [-8, -0.08, -4], model: MODELS.baseFloor1 },
  { position: [-4, -0.08, -4], model: MODELS.baseFloor5 },
  { position: [0, -0.08, -4], model: MODELS.baseFloor1 },
  { position: [4, -0.08, -4], model: MODELS.baseFloor5 },
  { position: [8, -0.08, -4], model: MODELS.baseFloor1 },
  { position: [-8, -0.08, 0], model: MODELS.baseFloor5 },
  { position: [-4, -0.08, 0], model: MODELS.baseFloor1 },
  { position: [0, -0.08, 0], model: MODELS.baseFloor5 },
  { position: [4, -0.08, 0], model: MODELS.baseFloor1 },
  { position: [8, -0.08, 0], model: MODELS.baseFloor5 },
  { position: [-8, -0.08, 4], model: MODELS.baseFloor1 },
  { position: [-4, -0.08, 4], model: MODELS.baseFloor5 },
  { position: [0, -0.08, 4], model: MODELS.baseFloor1 },
  { position: [4, -0.08, 4], model: MODELS.baseFloor5 },
  { position: [8, -0.08, 4], model: MODELS.baseFloor1 },
  { position: [-8, -0.08, 8], model: MODELS.baseFloor5 },
  { position: [-4, -0.08, 8], model: MODELS.baseFloor1 },
  { position: [0, -0.08, 8], model: MODELS.baseFloor5 },
  { position: [4, -0.08, 8], model: MODELS.baseFloor1 },
  { position: [8, -0.08, 8], model: MODELS.baseFloor5 },
];

const backWallX = [-8, -4, 0, 4, 8] as const;
const sideWallZ = [-4, 0, 4, 8] as const;
const roofModules = [-8, -4, 0, 4, 8] as const;

const variantLights: Record<BaseInteriorVariant, { color: string; intensity: number }> = {
  underhill: { color: "#f0a170", intensity: 18 },
  outpost: { color: "#d38d6f", intensity: 14 },
  korolev: { color: "#ffd3a5", intensity: 22 },
};

function BaseShell({ variant }: { variant: BaseInteriorVariant }) {
  const light = variantLights[variant];

  return (
    <group>
      {floorModules.map((tile) => (
        <Model
          key={`${tile.model}:${tile.position.join(",")}`}
          url={tile.model}
          position={tile.position}
        />
      ))}

      {backWallX.map((x) => (
        <Model key={`back-wall-${x}`} url={MODELS.baseWallDouble} position={[x, 0.28, -6.25]} />
      ))}
      {sideWallZ.map((z) => (
        <Model
          key={`left-wall-${z}`}
          url={MODELS.baseWallDouble}
          position={[-10.15, 0.28, z]}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}
      {sideWallZ.map((z) => (
        <Model
          key={`right-wall-${z}`}
          url={MODELS.baseWallDouble}
          position={[10.15, 0.28, z]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      ))}

      <Model url={MODELS.baseGarageFrame} position={[0, 0.28, 6.35]} rotation={[0, Math.PI, 0]} />
      <Model url={MODELS.baseWallHole} position={[-7.8, 0.28, 6.1]} rotation={[0, Math.PI, 0]} />
      <Model url={MODELS.baseWallDouble} position={[8.1, 0.28, 6.35]} rotation={[0, Math.PI, 0]} />

      {roofModules.map((x) => (
        <Model
          key={`roof-back-${x}`}
          url={MODELS.baseRoofMiddleAngle}
          position={[x, 5.65, -4.4]}
          scale={[1.05, 1, 1.05]}
        />
      ))}
      <Model url={MODELS.baseRoofSideAngle} position={[-10.2, 5.75, 0.2]} scale={[1, 1, 3.2]} />
      <Model
        url={MODELS.baseRoofSideAngle}
        position={[10.2, 5.75, 0.2]}
        rotation={[0, Math.PI, 0]}
        scale={[1, 1, 3.2]}
      />

      {backWallX.map((x) => (
        <Model key={`wall-cap-${x}`} url={MODELS.baseWallTop} position={[x, 6.05, -6.25]} />
      ))}

      <Model url={MODELS.baseLamp} position={[-6, 4.5, 5.7]} scale={3.2} />
      <Model
        url={MODELS.baseLamp}
        position={[0, 4.7, -5.9]}
        rotation={[0, Math.PI, 0]}
        scale={3.2}
      />
      <Model url={MODELS.baseLamp} position={[6, 4.5, 5.7]} scale={3.2} />
      <pointLight
        position={[-6, 4.6, 4.7]}
        color={light.color}
        intensity={light.intensity}
        distance={8}
      />
      <pointLight
        position={[0, 4.8, -3.6]}
        color={light.color}
        intensity={light.intensity}
        distance={9}
      />
      <pointLight
        position={[6, 4.6, 4.7]}
        color={light.color}
        intensity={light.intensity}
        distance={8}
      />
    </group>
  );
}

const roverSlots: Record<BaseInteriorVariant, { position: Vec3; rotation: Vec3; scale: number }> = {
  underhill: { position: [-3.7, 0.38, 0.9], rotation: [0, 0.18, 0], scale: 2.45 },
  outpost: { position: [-4.8, 0.38, 2.4], rotation: [0, 1.05, 0], scale: 1.85 },
  korolev: { position: [2.7, 0.38, 1.2], rotation: [0, -0.28, 0], scale: 1.95 },
};

export function BaseRoverBay({ variant }: { variant: BaseInteriorVariant }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  const slot = roverSlots[variant];

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    g.position.y = slot.position[1] + Math.sin(t.current * 0.85) * 0.012;
    g.rotation.z = Math.sin(t.current * 0.5) * 0.004;
  });

  return (
    <group ref={ref} position={slot.position} rotation={slot.rotation}>
      <Model url={MODELS.rover} scale={slot.scale} />
    </group>
  );
}

const npcSlots = {
  quartermaster: { position: [-7.1, 0.35, 3.35], rotation: [0, 0.45, 0] },
  navigator: { position: [6.55, 0.35, 3.25], rotation: [0, -0.55, 0] },
  colonist: { position: [-1.2, 0.35, 4.65], rotation: [0, -0.1, 0] },
  reception: { position: [-6.2, 0.35, 2.2], rotation: [0, 0.55, 0] },
  records: { position: [5.8, 0.35, 2.2], rotation: [0, -0.5, 0] },
} satisfies Record<string, { position: Vec3; rotation: Vec3 }>;

export type BaseNpcSlot = keyof typeof npcSlots;

export function BaseNpc({ slot, scale = 0.82 }: { slot: BaseNpcSlot; scale?: number }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  const spec = npcSlots[slot];

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    t.current += delta;
    g.position.y = spec.position[1] + Math.abs(Math.sin(t.current * 1.05)) * 0.025;
    g.rotation.y = spec.rotation[1] + Math.sin(t.current * 0.38) * 0.04;
  });

  return (
    <group ref={ref} position={spec.position} rotation={spec.rotation}>
      <Model url={MODELS.astronaut} scale={scale} />
    </group>
  );
}

const terminalSlots = {
  manifest: {
    position: [-8.25, 0.34, 2.15],
    rotation: [0, 0.72, 0],
    model: MODELS.baseTestMachine,
  },
  nav: { position: [7.75, 0.34, 1.9], rotation: [0, -0.72, 0], model: MODELS.baseElectrical2 },
  habitat: { position: [2.9, 0.34, -4.6], rotation: [0, -0.08, 0], model: MODELS.baseElectrical1 },
  records: {
    position: [6.35, 0.34, -4.35],
    rotation: [0, -0.18, 0],
    model: MODELS.baseTestMachine,
  },
} satisfies Record<string, { position: Vec3; rotation: Vec3; model: string }>;

export type BaseTerminalSlot = keyof typeof terminalSlots;

export function BaseTerminal({ slot }: { slot: BaseTerminalSlot }) {
  const spec = terminalSlots[slot];
  return (
    <group position={spec.position} rotation={spec.rotation}>
      <Model url={spec.model} scale={slot === "manifest" || slot === "records" ? 0.82 : 1.15} />
      <Model url={MODELS.baseLamp} position={[0.1, 2.95, 0.1]} scale={2.2} />
      <pointLight position={[0.15, 3.2, 0.05]} color="#44ffaa" intensity={7} distance={3.5} />
    </group>
  );
}

export function BaseCargo({ dense = false }: { dense?: boolean }) {
  return (
    <group>
      <Model
        url={MODELS.baseShelf}
        position={[-9.15, 0.34, -3.95]}
        rotation={[0, 1.55, 0]}
        scale={1.15}
      />
      <Model
        url={MODELS.baseWoodenCrate}
        position={[-8.15, 0.34, -0.8]}
        rotation={[0, 0.4, 0]}
        scale={1.4}
      />
      <Model
        url={MODELS.baseMetalBarrel}
        position={[-9.05, 0.34, 0.8]}
        rotation={[0, -0.2, 0]}
        scale={1.25}
      />
      <Model
        url={MODELS.baseStorageTank}
        position={[8.4, 0.34, -4.35]}
        rotation={[0, -0.2, 0]}
        scale={0.92}
      />
      <Model
        url={MODELS.baseTankSystem}
        position={[5.2, 0.34, -4.65]}
        rotation={[0, 0.1, 0]}
        scale={1.05}
      />
      {dense && (
        <>
          <Model
            url={MODELS.baseWoodenCrate}
            position={[8.7, 0.34, 0.4]}
            rotation={[0, -0.35, 0]}
            scale={1.25}
          />
          <Model
            url={MODELS.baseMetalBarrel}
            position={[9.1, 0.34, 2.1]}
            rotation={[0, 0.35, 0]}
            scale={1.1}
          />
          <Model
            url={MODELS.basePlatformHandrail}
            position={[0.4, 0.34, 5.0]}
            rotation={[0, 0, 0]}
            scale={1.15}
          />
        </>
      )}
    </group>
  );
}

export function BaseInteriorScene({
  variant,
  children,
}: {
  variant: BaseInteriorVariant;
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <MarsLighting />
      <Sky />
      <Ground width={120} depth={170} position={[0, 0, 75]} />
      <BaseShell variant={variant} />
      {children}
    </Suspense>
  );
}
