/**
 * Encounter NPC brain — steers a single trader NPC toward the rover dock, signals HAIL
 * when arrived, then seeks off-screen on DEPART. WeakMap<World, Map<Entity, NpcBrain>>
 * pattern copied from unitAI.ts: Vehicle+ArriveBehavior ticked at FIXED_DT, position
 * written into the Encounter trait. NO setRenderComponent.
 *
 * Determinism guardrails: only Arrive/Seek behaviors, NEVER WanderBehavior, NEVER
 * yuka Time/time.update() — tick with FIXED_DT from src/engine/loop.ts. All rolls
 * via the seeded rng fork, NEVER Math.random.
 */
import type { Entity, World } from "koota";
import { ArriveBehavior, SeekBehavior, Vector3, Vehicle } from "yuka";
import { FIXED_DT } from "@/engine/loop";
import { Encounter } from "@/sim/traits";

export type NpcState = "APPROACH" | "HAIL" | "DEPART" | "DONE";

interface NpcBrain {
  vehicle: Vehicle;
  arrive: ArriveBehavior;
  seek: SeekBehavior;
  state: NpcState;
  hailSent: boolean;
}

const DOCK_X = 0;
const DOCK_Y = 0;
const DOCK_Z = 0;
const ARRIVE_RADIUS = 0.5;
const DEPART_X = 18;

const brains = new WeakMap<World, Map<Entity, NpcBrain>>();

function getOrCreateBrain(world: World, entity: Entity, startX: number): NpcBrain {
  let worldMap = brains.get(world);
  if (!worldMap) {
    worldMap = new Map();
    brains.set(world, worldMap);
  }
  let brain = worldMap.get(entity);
  if (!brain) {
    const vehicle = new Vehicle();
    vehicle.position.set(startX, DOCK_Y, DOCK_Z);
    vehicle.maxSpeed = 4;

    const arrive = new ArriveBehavior(new Vector3(DOCK_X, DOCK_Y, DOCK_Z), 3, 0.01);
    const seek = new SeekBehavior(new Vector3(DEPART_X, DOCK_Y, DOCK_Z));
    arrive.active = true;
    seek.active = false;
    vehicle.steering.add(arrive);
    vehicle.steering.add(seek);

    brain = { vehicle, arrive, seek, state: "APPROACH", hailSent: false };
    worldMap.set(entity, brain);
  }
  return brain;
}

export function pruneEncounterBrains(world: World): void {
  const worldMap = brains.get(world);
  if (!worldMap) return;
  for (const [entity] of worldMap) {
    if (!world.has(entity) || !entity.get(Encounter)?.active) {
      worldMap.delete(entity);
    }
  }
}

export function tickEncounterBrain(world: World, entity: Entity, startX: number): NpcState {
  const enc = entity.get(Encounter);
  if (!enc?.active) return "DONE";

  const brain = getOrCreateBrain(world, entity, startX);

  if (brain.state === "APPROACH") {
    brain.arrive.active = true;
    brain.seek.active = false;
    brain.vehicle.update(FIXED_DT);

    const dx = brain.vehicle.position.x - DOCK_X;
    const dy = brain.vehicle.position.y - DOCK_Y;
    const dist = Math.hypot(dx, dy);

    if (dist <= ARRIVE_RADIUS && !brain.hailSent) {
      brain.state = "HAIL";
      brain.hailSent = true;
      brain.vehicle.velocity.set(0, 0, 0);
    }
  } else if (brain.state === "DEPART") {
    brain.arrive.active = false;
    brain.seek.active = true;
    brain.seek.target.set(DEPART_X, DOCK_Y, DOCK_Z);
    brain.vehicle.update(FIXED_DT);

    if (brain.vehicle.position.x >= DEPART_X - 0.5) {
      brain.state = "DONE";
    }
  }

  entity.set(Encounter, {
    ...enc,
    npcX: brain.vehicle.position.x,
    npcY: brain.vehicle.position.y,
    npcZ: brain.vehicle.position.z,
  });

  return brain.state;
}

export function triggerDepart(world: World, entity: Entity): void {
  const worldMap = brains.get(world);
  const brain = worldMap?.get(entity);
  if (brain && brain.state === "HAIL") {
    brain.state = "DEPART";
    brain.arrive.active = false;
    brain.seek.active = true;
  }
}
