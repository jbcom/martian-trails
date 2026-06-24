# STANDARDS.md — Martian Trail

Non-negotiables. See `AGENTS.md` for the build workflow and `docs/ARCHITECTURE.md` for structure.

## Code quality
- **Decompose by responsibility, not line count.** One system = one file. A file may be large
  if cohesive (a config table, a world generator); it may not own three subsystems.
- **No stubs, TODOs, `pass`, `it.todo`, or `as any`** as a way to "finish." Fix or delete.
- **Refactors, not shims.** Move a module → move every caller in the same commit.
- **Sim purity:** `src/sim/**` pure TS, deterministic (`createRng`, engine clock), no DOM/pixi/svelte.
- Files trend small and single-responsibility; `.claude/gates.json` warns past ~600 lines.

## Determinism
The simulation is seedable and reproducible. No raw `Math.random()` / `Date.now()` /
`performance.now()` in `src/sim` or `src/engine` — use the `createRng(seed)` facade and the
engine clock. Same seed → same run.

## Content vs code
Gameplay content (events, depot stock, outpost services, hazards, dialogue, crew) is **data**
in `src/content/**.json`, validated by zod schemas in `src/schemas`, interpreted by generic
engines. Tunables are data in `src/config/*.json`. Magic numbers in logic are a bug.

## Brand & visual
- The Mars palette is the seed identity: `--mars-bg #1a0b08`, `--mars-red #8a3324`,
  `--mars-dust #cc7052`, `--mars-sand #e89b71` — defined as tokens in `src/styles/tokens.css`,
  mirrored in `tokens.ts`, kept in sync by `tokens.test.ts`.
- Real curated art (2D sprite / 3DPSX side-view per `docs/ART-DIRECTION.md`) — not procedural
  `PIXI.Graphics` — in the production build.
- Every render/UI/asset change is visually verified (screenshot read vs reference) before commit.
  Spec drift is a code bug.

## Quality is owned, not delegated
"Tests pass" ≠ "app runs." A change is done when the app runs and the behavior is observed
(Safari playtest, screenshot read). The reviewer trio is not a substitute for looking at the thing.

## Platform
Touch input is primary; hover is decoration. Respect safe-area insets. Layout adapts across
phone / tablet / unfolded foldable. Render budget targets a mid-tier device (Pixel 5a class).

## Git
pnpm only (no npm/yarn lockfiles). Conventional Commits. Squash-merge via PR. Never commit to
`main` directly. Versioning is release-please's job.
