---
title: State
updated: 2026-06-24
status: current
domain: context
---

# Martian Trail — Current State

What's shipped. (The plan/queue is `.agent-state/directive.md`.)

## Shipped — Martian Trail is a complete, playable game, live on the web
**https://jonbogaty.com/martian-trails/** (auto-deployed from `main` via `cd.yml`).

The full Oregon-Trail-equivalent loop plays end to end, with Martian equivalents:
**boot → sponsor/difficulty select → provisioning depot → travel → trail events → Hazard
Traverse → EVA Prospecting → outpost stops → terminus / game-over.**

### Milestones (all merged to main)
- **M1 — Foundation** (#1): Martian Trail branding; Vite `base` (Pages/Capacitor); Capacitor 8
  Android; three-workflow CI (`ci`→`release`→`cd`, SHA-pinned, real Pages deploy); full doc set.
  Stack pivot to the house dialect: **React 19 + R3F + drei + @react-three/postprocessing +
  framer-motion + Three.js (ortho side-3D) + Tailwind v4**, all latest (Vite 8, Vitest 4, Cap 8,
  TS 6, Biome 2).
- **M2 — Design system** (#3): Mars-palette tokens (`tokens.{css,ts}` + sync test), self-hosted
  Rajdhani/Inter/JetBrains Mono fonts, `docs/DESIGN-SYSTEM.md`.
- **M3 — Architecture** (#4): `src/{core,engine,sim,render,state,content,config,audio,platform,
  schemas,ui}`. Pure seeded sim (koota traits/systems/tick, config-as-data + zod), fixed-timestep
  engine, zustand store + frame-cadence diagnostics bridge, howler audio, R3F PSX scenes. Real
  itch PSX pipeline + GenAI (Gemini events/portraits) + a **meshy-generated Mars rover**.
- **M5 — The playable loop** (#5): sponsor select (budget+score multiplier), provisioning store
  (budget hard-gated), travel HUD (pace/rations/crew abilities), GenAI trail events, **Hazard
  Traverse** (river-crossing analog: 5 hazards, read gauge, seeded outcomes), **EVA Prospecting**
  (hunting analog: O₂-clock scan/drill minigame), outpost dock (GenAI colonist news, rest,
  resupply), terminus (UNOMA score) + typed game-over.
- **M6 — Polish** (this branch, `feat/m6-polish`): state-reactive howler audio; **responsive
  phone/tablet/unfolded-foldable** (verified all 3 in Safari); juice (screen transitions, camera
  shake, critical-alarm overlay, dust-storm VFX, haptics, preload); the POC's dust-storm weather
  gap finally wired.

### Art / content
3D-PSX side-view (Kenney/pixel rejected). Real curated PSX assets (astronaut, machinery, rocks,
hangar) + the meshy rover; **zero procedural/placeholder geometry**. GenAI: 12 trail events,
crew portraits, outpost lore — all real, validated content.

## Verification
Gates green: `check` (tsc), `lint`, `test` 238, `test:browser` 23, `build`, `cap:sync`. The full
loop + every screen verified in Safari at phone/tablet/foldable.

## Next
M6 PR → merge → live. Remaining: definition-of-done (APK build verification), then the game is
fully shipped. Future polish rides on the same structure.
