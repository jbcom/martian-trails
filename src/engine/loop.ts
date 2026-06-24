/**
 * Deterministic fixed-timestep loop (blobolines dialect). A host (R3F `useFrame`
 * or rAF) feeds wall-clock deltas; `advance()` drains an accumulator in fixed
 * steps so the sim is frame-rate independent and reproducible. `alpha` is the
 * render-interpolation fraction for smoothing between sim steps.
 *
 * The game's Sol/time accumulation rides on this — never on raw frame deltas.
 */
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DELTA = 1 / 15; // clamp huge gaps (tab backgrounded)
export const MAX_STEPS_PER_FRAME = 5; // spiral-of-death guard

export interface LoopState {
  accumulator: number;
  steps: number;
  alpha: number;
}

export function createLoopState(): LoopState {
  return { accumulator: 0, steps: 0, alpha: 0 };
}

/**
 * Advance the fixed loop by a wall-clock `frameDelta` (seconds). Calls `step(dt)`
 * zero or more times with a constant `FIXED_DT`. Returns how many steps ran.
 */
export function advance(state: LoopState, frameDelta: number, step: (dt: number) => void): number {
  const clamped = Math.min(Math.max(0, frameDelta), MAX_FRAME_DELTA);
  state.accumulator += clamped;

  let ran = 0;
  while (state.accumulator + 1e-9 >= FIXED_DT && ran < MAX_STEPS_PER_FRAME) {
    step(FIXED_DT);
    state.accumulator -= FIXED_DT;
    state.steps++;
    ran++;
  }

  // If we hit the cap with time still owed, drop it rather than spiral.
  if (ran >= MAX_STEPS_PER_FRAME && state.accumulator > FIXED_DT) {
    state.accumulator = 0;
  }

  state.alpha = state.accumulator / FIXED_DT;
  return ran;
}
