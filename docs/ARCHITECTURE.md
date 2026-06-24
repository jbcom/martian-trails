---
title: Architecture
updated: 2026-06-23
status: current
domain: technical
---

# Martian Trail — Architecture

The target structure for elevating the POC into a production game, grounded in the
house dialect (`blobolines` skeleton + `a-good-old-fashioned-adventure` content/config/
persistence + `mean-streets` tokens/screens). One unified effort: code decomposition,
config decomposition, and the production libraries that make it a polished 2026 game —
not a procedural-graphics POC.

## Stack (latest, no old packages)

Svelte 5 (runes) · Vite 8 · **Three.js (orthographic side-view 3D)** · Capacitor 8 ·
TypeScript 6 · Biome 2 · Vitest 4 (`@vitest/browser-playwright`, `vitest-browser-svelte`) ·
Playwright.

**Render engine decision (2026-06-23):** Three.js with an orthographic camera, not PixiJS.
The art direction is 3DLowPoly Kenney "Space" GLBs in a side view (`docs/ART-DIRECTION.md`);
Three gives real lighting, parallax, and the animated *rover-noses-down-the-ramp* Hazard
Traverse that flat 2D/Pixi cannot. Matches the house dialect (blobolines/agofa use Three).
The Pixi-7 POC renderer is replaced wholesale in the render decomposition (M3); sim, content,
state, audio, and the screen-router are renderer-agnostic and unaffected.

### Production libraries to add (the "elevation" set)
| Role | Library | Why |
|------|---------|-----|
| Render | `three` (+ GLTFLoader, ortho camera) | 3DLowPoly GLB side-view; lighting/parallax/animated hazard |
| ECS | `koota` | House standard; renderer-agnostic game state via `trait()` + `world.query()` |
| RNG/determinism | `seedrandom` | One `createRng(seed): Rng` facade; **no raw `Math.random()`** in sim |
| Audio | `howler` | House standard; channels, ducking, gesture-unlock, preload |
| Content validation | `zod` | Runtime schema-validate content JSON + persisted saves |
| Persistence | `@capacitor/preferences` (settings/run) → `@capacitor-community/sqlite` + `drizzle-orm` if saves go relational |
| UI juice | `motion` (and/or `gsap`) | Screen transitions, HUD feedback |
| Platform | `@capacitor/haptics`, `@capacitor/screen-orientation`, `@capacitor/device`, `@capacitor-community/keep-awake` | Mobile polish, safe-area, orientation |

Procedural `PIXI.Graphics` is replaced by real curated art (2D sprites and/or 3D-PSX
side-view assets) loaded from the asset library / itch — see `docs/ART-DIRECTION.md`.

## Folder decomposition

```
src/
  core/        primitives — math (clock, createRng), types (SCREENS/PHASES const→union)
  engine/      the loop — fixed-timestep advance() accumulator + render interpolation alpha
  sim/         PURE gameplay — NO pixi/svelte/DOM imports. koota traits + systems.
    systems/   one system = one file (resources, morale, hazard, eva, illness, terrain…)
    factories.ts  entity spawn (attach traits)
    tick.ts    step(world, dt) — hand-ordered system calls (dependency order)
    rng.ts     seeded facade
  render/      Three.js only — reads sim, never written-to by sim
    scenes/    per-screen render (garage/depot, travel, outpost, hazard, eva, terminus)
    vfx/       particles, dust, weather, camera-shake (ice-sheet / dust-storm done here)
    assets/    GLB loaders, ortho camera rig, material/lighting setup
  state/       Svelte store (UI/phase/settings cadence) + plain-object diagnostics bridge (frame cadence)
  content/     PURE DATA (JSON) — events, depot stock, outposts, hazards, dialogue, crew
  config/      per-domain JSON tunables + typed loader (+ co-located .test.ts)
  audio/       howler wrapper + symbolic audio library manifest
  platform/    capacitor bridges — haptics, device, safe-area/scale, persistence, orientation
  styles/      tokens.css + tokens.ts (mirror) + tokens.test.ts (sync) + fonts.css
  ui/          Svelte screens + design-system components
  schemas/     zod schemas for content + config + saves
```

## The three load-bearing patterns

### 1. Fixed-timestep loop (engine/loop.ts)
`FIXED_DT = 1/60`, accumulator drains in fixed steps with a spiral-of-death guard and a
render-interpolation `alpha`. A host (Svelte `onMount` rAF / Pixi ticker) feeds wall-clock
deltas; `advance(state, frameDelta, step)` owns the fixed loop. `step` runs `sim/tick.ts`.
The game's time→Sol accumulation rides on this, not on raw `ticker.deltaMS`.

### 2. Sim ↔ render/UI bridge (by cadence)
- **Frame cadence (sim→render):** a plain mutable `state/diagnostics.ts` object the sim
  writes each step; Pixi reads it in its render. NOT the Svelte store (60×/s store writes
  tank reactivity).
- **Human cadence (UI):** Svelte store holds screen/phase, settings, run-summary. UI reads
  the store; **UI never touches Pixi objects** — only the documented bridge.
- Sim purity enforced by import discipline: `src/sim/**` imports no pixi/svelte/DOM.

### 3. Screens as a const-union, not an enum-gated `update()`
```ts
export const SCREENS = ["boot","sponsor","depot","travel","hazard","eva",
  "outpost","event","terminus","gameover"] as const;
export type Screen = (typeof SCREENS)[number];
```
Each screen is its own Svelte component + its own render scene, selected by conditional
render (lazy where heavy). This directly fixes the POC-regression where one
`update()` early-returns unless `mode==='travel'` and leaves the depot black: every screen
draws its own scene. ("Code interprets content, never embeds it" applies to screen content
too — depot stock, outpost services, event copy all come from `src/content/`.)

## Config & content decomposition
- **Tunables** → `src/config/*.json` (resources, travel, hazard, eva, illness, scoring,
  crew-traits, upgrades) + a typed loader with fail-fast validation; co-located `.test.ts`.
- **Content** → `src/content/**.json` interpreted by generic engines: events (declarative
  option/effect), depot stock, outpost services, hazard definitions, dialogue/lore, crew.
- **Tokens** → `src/styles/tokens.{css,ts}` + sync test (the Mars palette + type scale).
- **Schemas** → `src/schemas/*` (zod) gate content/config/saves in CI.

## Responsive form factors (phone / tablet / unfolded foldable)
Layout adapts across three classes, not just "mobile-first":
- **Phone (portrait, narrow):** HUD panels stack/drawer; single-column store; large touch targets.
- **Tablet (landscape, medium):** side HUD + scene; two-column store.
- **Unfolded foldable (wide):** scene gets the wide canvas; HUD reflows to side rails; no letterboxing.
Driven by container/viewport breakpoints + safe-area insets (`env(safe-area-inset-*)`),
touch-primary input, Pixi resize to the live canvas. Verified on each form factor via
Safari playtest (window frontmost + `visibilityState === "visible"` before screenshot).

## Determinism & gates
`src/sim/**` is pure, seeded (`createRng`), no `Math.random()`/`performance.now()` (enforced
by `.claude/gates.json` ban_patterns). Render/UI changes require a browser-test pass;
audio changes require an audio-graph test; Capacitor changes require `cap:sync` evidence.
