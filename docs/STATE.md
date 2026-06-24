---
title: State
updated: 2026-06-23
status: current
domain: context
---

# Martian Trail — Current State

Round-by-round reality of what's shipped. (The plan/queue is `.agent-state/directive.md`.)

## Shipped
- **Foundation (M1):** Martian Trail branding; Vite `base` handling (Pages/Capacitor);
  Capacitor 8 Android platform (committed `android/`, `cap:sync` green); three-workflow CI
  (`ci`→`release`→`cd`, SHA-pinned, Node 22, real Pages deploy); entire toolchain bumped to
  latest (Svelte 5, Vite 8, Vitest 4, Pixi 8, Cap 8, TS 6, Biome 2).
- **Docs:** `README`, `AGENTS`, `STANDARDS`, `CHANGELOG`, `docs/ARCHITECTURE`, `docs/GAME-DESIGN`.

## In flight
- Architecture decomposition (M3): the POC scaffold (`src/lib/{GameState,Renderer,AudioEngine}.ts`
  + monolithic `App.svelte`) is being rewritten into the `src/{core,engine,sim,render,state,
  content,config,...}` structure on Svelte 5 / Pixi 8 with koota + production libs.

## Known gaps / red (intentional — the punch-list)
- `Renderer.ts` uses Pixi 7 API (breaks on Pixi 8: async `Application.init`, `BLEND_MODES`,
  `beginFill`) → fixed in the render decomposition (M3).
- Depot screen renders only the left panel; no garage backdrop (the `update()` early-returns
  unless `mode==='travel'`) → fixed by per-screen render scenes (M3), not patched.
- Budget regression (10k, outside the store), dust-storm system dark, 2 events vs POC's 3,
  no sponsor select / save / typed illness / Hazard Traverse / EVA minigame → built in M5.

## Next
M2 design system/tokens, then M3 decomposition (the foundation for everything else).
