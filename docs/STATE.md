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
- **M6 — Polish** (#6): state-reactive howler audio; **responsive
  phone/tablet/unfolded-foldable** (verified all 3 with browser-visible artifacts); juice (screen transitions, camera
  shake, critical-alarm overlay, dust-storm VFX, haptics, preload); the POC's dust-storm weather
  gap finally wired.
- **M7 — Production hardening** (#7): all four generated crew portraits, save/continue with
  Hall of Records, expanded 24-event pool, richer music context, visual-sweep e2e, and
  browser-visible save/resume proof.

## In progress — Milestone 8 diegetic encounters
Local branch: `feat/m8-encounters`.

- **M8 research**: `docs/ENCOUNTERS.md` synthesizes yuka, sibling dialogue/NPC architecture,
  and MECC Trail lineage into the build spec.
- **M8-1 Encounter engine + Trader slice**: content-driven encounter banks, pure resolver,
  yuka `Vehicle`/`Arrive` NPC brain, encounter trait/save data, EncounterScene/Panel, and
  seeded trail trader encounters.
- **M8-2 Depot social hub**: Underhill now renders as an enclosed 3DPSX modular base, not a
  panel-first depot. The reusable `BaseInteriorScene` shell slots rover, terminal, NPC, and cargo
  placements for Underhill, outpost forts, and the Korolev finale. Okonkwo/Reyes resolve encounter
  banks from station interactions before departure; choices set encounter flags and can focus the
  provisioning manifest. Flags carry into the run controller on departure.

### Art / content
3D-PSX side-view (Kenney/pixel rejected). Real curated PSX assets (astronaut, machinery, rocks,
modular base kit) + the meshy rover; **zero procedural/placeholder geometry**. GenAI: 24 trail
events, crew portraits, NPC portraits, outpost lore — all real, validated content.

## Verification
Current local M8 proof: `pnpm check`, `pnpm lint`, `pnpm test` (295), `pnpm test:browser` (36),
`pnpm build`, `pnpm e2e`, `pnpm e2e:visual`. Vitest browser captures the isolated
`BaseInteriorScene` matrix to `artifacts/base-interior/*.png`; Playwright visual sweep captures
app-flow frames under `artifacts/sweep/*.png`, including `depot-codriver-*` and
`travel-codriver-*` for phone/tablet/foldable profiles. Screenshot review read the final
Underhill recruit berth, travel co-driver HUD, outpost base shell, and base-interior captures:
no bottom void leak, no clipped co-driver portraits, and the phone berth shows all three recruits
without scrolling. M8-4 adds validated veteran/liaison advice pairs for every outpost; selecting
one advisor applies a route-prep resource patch and persists the selected `flag:advice:*`. M8-5
expands the seeded trail encounter pool from trader-only to trader, stranded hauler, scavenger,
and rival expedition roadside NPCs; each new bank has effect-bearing choices and decline paths,
and the existing in-scene Encounter trait still handles halt/respond/resume.

## Next
M8 final review/PR. M8-6 GOAP event director and M8-7 fuzzy NPC mood remain gated polish unless
playtesting shows the current seeded encounter/event pacing is too flat.
