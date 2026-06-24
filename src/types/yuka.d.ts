/**
 * Minimal type declarations for yuka 0.7.8 (no upstream @types package).
 * Covers only the behaviors used by encounterAI.ts.
 */
declare module "yuka" {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    clone(): Vector3;
  }

  export class SteeringBehavior {
    active: boolean;
  }

  export class SeekBehavior extends SteeringBehavior {
    target: Vector3;
    constructor(target?: Vector3);
  }

  export class ArriveBehavior extends SteeringBehavior {
    target: Vector3;
    /**
     * @param target - destination
     * @param deceleration - deceleration factor (higher = faster stop)
     * @param tolerance - arrival tolerance radius
     */
    constructor(target?: Vector3, deceleration?: number, tolerance?: number);
  }

  export class FleeBehavior extends SteeringBehavior {
    target: Vector3;
    constructor(target?: Vector3);
  }

  export class MovingEntity {
    position: Vector3;
    velocity: Vector3;
    maxSpeed: number;
    update(delta: number): this;
  }

  export class SteeringManager {
    add(behavior: SteeringBehavior): this;
    remove(behavior: SteeringBehavior): this;
  }

  export class Vehicle extends MovingEntity {
    steering: SteeringManager;
  }
}
