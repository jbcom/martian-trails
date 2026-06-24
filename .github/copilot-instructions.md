# GitHub Copilot — Martian Trail

This project's conventions and doctrine live in the repo root, not here. Follow:

- `CLAUDE.md` — identity, stack, commands, profile includes.
- `AGENTS.md` — how we build (docs→tests→code, architecture-first, content-over-code,
  red-is-the-map, mandatory visual verification).
- `STANDARDS.md` — non-negotiables (sim purity, determinism, decomposition, brand).
- `docs/ARCHITECTURE.md` — `src/{core,engine,sim,render,state,content,config,…}` structure.
- `docs/GAME-DESIGN.md` — the Oregon-Trail→Mars mechanical-equivalency map.

Key rules: pnpm only; Conventional Commits; `src/sim/**` is pure & deterministic (no DOM,
no `Math.random`); gameplay content is JSON data interpreted by generic engines; never
manufacture green by suppressing lint/test failures.
