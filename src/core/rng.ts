import seedrandom from "seedrandom";

/**
 * Seeded RNG facade — the ONLY source of randomness in the sim. Never call
 * Math.random() in src/sim or src/engine (gates enforce). Same seed → same run,
 * which makes the simulation reproducible and testable.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability p (0..1). */
  chance(p: number): boolean;
  /** Uniformly pick one element. Throws on empty input. */
  pick<T>(items: readonly T[]): T;
  /** A fresh independent stream derived from this one (for per-system isolation). */
  fork(label: string): Rng;
  /** The seed this stream was created from. */
  readonly seed: string;
}

export function createRng(seed: string): Rng {
  const prng = seedrandom(seed);
  const rng: Rng = {
    seed,
    next: () => prng(),
    int: (min, max) => Math.floor(prng() * (max - min + 1)) + min,
    range: (min, max) => min + prng() * (max - min),
    chance: (p) => prng() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error("createRng.pick: empty array");
      return items[Math.floor(prng() * items.length)];
    },
    fork: (label) => createRng(`${seed}:${label}`),
  };
  return rng;
}
