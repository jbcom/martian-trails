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
  (`ci`→`release`→`cd`, SHA-pinned, Node 22, real Pages deploy); full doc set.
- **Stack pivot:** dropped Svelte + PixiJS for the house dialect — **React 19 +
  @react-three/fiber + drei + @react-three/postprocessing + framer-motion + Three.js
  (ortho side-view 3D) + Tailwind v4**, all on latest (Vite 8, Vitest 4, Cap 8, TS 6, Biome 2).
  Dead POC source removed; a minimal R3F boot shell renders (verified in Safari). All gates
  green: check (tsc), lint, test, build.
- **Docs:** `README`, `AGENTS`, `STANDARDS`, `CHANGELOG`, `docs/{ARCHITECTURE,GAME-DESIGN,
  ART-DIRECTION,STATE,TESTING,DEPLOYMENT}`.

## Decisions locked
- Render: Three.js ortho side-view 3D GLB (not Pixi/2D). Art: 3DLowPoly Kenney "Space" family.
- UI: React + full R3F ecosystem (not Svelte). State: zustand (UI) + plain-object frame bridge.

## In flight
- M2 (design system/tokens) then M3 (architecture decomposition): build out
  `src/{core,engine,sim,render,state,content,config,…}` with koota + the production libs, on
  the R3F shell. The POC mechanics are ported from the frozen `red_mars_the_ares_trail.html`
  + git history into the new pure `src/sim`.

## Known gaps (the build backlog, per directive)
- No gameplay yet beyond the boot shell — depot/travel/hazard/eva/outpost/terminus, sponsor
  select, save, typed illness, Hazard Traverse, EVA Prospecting all built in M5 on the M3
  structure. Real art replaces the placeholder scene in M6.

## Next
M2 design system/tokens → M3 decomposition (the foundation for the loop).
