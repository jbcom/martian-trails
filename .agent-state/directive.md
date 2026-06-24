# Continuous Work Directive — martian-trails

**Status:** ACTIVE
**Owner:** Claude
**Mandate:** "Bring this POC to a fully designed and actualized game called 'Martian Trail' inspired by the original Oregon Trail with a unique look and feel, design tokens, and fontography. Leverage 2DLowPoly / 2DPhotorealistic / Audio in /Volumes/home/assets. Port the itch downloader (../a-good-old-fashioned-adventure) and GenAI pipeline (../maga-money-moves). Set up the same ci.yml > release.yml > cd.yml release flow and the same vitest browser plugin / playwright structure. Work in long-running local branches, playtest in a browser with screenshot capture; use the Safari skill (Chrome is in use by someone else)."

## What CONTINUOUS means
1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize — git log is the summary.
4. Never stop for context pressure — task-batch + PreCompact handle it.
5. Never stop because a task feels big — pick the next atomic commit.
6. Only stop on: explicit user halt, red CI blocking, or genuine STOP_FAIL.

## Operating loop
while queue has [ ] items: read own spec docs → use-case enumerate (if non-trivial) → implement → verify (tests + Safari playtest + READ own screenshot vs named reference) → commit (Conventional Commits) → dispatch reviewers (background, scoped to diff) → backward+forward sweep → mark [x] → next.

## Playtest protocol
- Drive the user's **Safari** via the `claude-for-safari` skill for all playtest + screenshot capture. Do NOT use Chrome / claude-in-chrome / chrome-devtools-mcp — Chrome is in active use by someone else.
- Every render/UI/asset commit: run the game, screenshot, READ the screenshot, compare against the named reference in docs/DESIGN-SYSTEM.md, fix before committing.

## Branch protocol
- One local branch per milestone (`feat/m1-foundation`, etc). Layer items as forward commits. Open ONE PR per milestone at the end; squash-merge once green; next milestone = fresh branch off updated main. Never commit to main directly.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now" | "continue-on-error" in CI gates
"pause point" | "natural pause" | "fresh session" | "next session" | "stopping point" | "clean handoff"

---

## Known regressions vs POC (the "must not look worse than the POC" bar)
- **Depot renders black on the right ~75%.** Root cause: `Renderer.update()` early-returns at `if (state.mode !== "travel") return` (Renderer.ts:418), so the Underhill airlock-garage backdrop + sky are never advanced/shown in depot mode. The POC rendered the garage scene behind the glass overlay from boot. This is a SYMPTOM of the monolithic mode-gated `update()` — fix it PROPERLY during the render decomposition (per-scene render, M3/M6), not via a band-aid. Verify with a correct Safari playtest (window frontmost + `visibilityState === "visible"` BEFORE screenshotting — a hidden tab captures all-black; see [[loop-playtest-safari-not-chrome]]).
- Other scaffold regressions (budget 10k vs 25k, dust-storm dark, 2 events vs 3, dead thermal/Hardpan, missing alarm overlay/boulder spawner) tracked in M5.

## Architectural mandate (user, 2026-06-23)
This is NOT a patch-the-POC job. Plan + decompose properly: (1) the ADDED production libraries that elevate POC→polished production game, (2) proper CODE decomposition, (3) proper CONFIG decomposition. M2–M6 below are rewritten around this after the library-stack survey lands (mean-streets/grovekeeper/cosmic-cults dialect). Architecture doc first, then build. Never patch a symptom when the structure is the cause.

## Source-of-truth references
- Design intent: `Gemini-Red_Mars_Oregon_Trail_Game_Concept.md` (transcript — authoritative = cumulative feature list + final two turns: reject CRT, keep diegetic glassmorphic airlock outfitting). Playable POC: `red_mars_the_ares_trail.html`.
- Dialect exemplars: `~/src/jbcom/blobolines`, `~/src/jbcom/a-good-old-fashioned-adventure`, `~/src/arcade-cabinet/{grovekeeper,cosmic-cults}`.
- itch downloader port: `~/src/jbcom/a-good-old-fashioned-adventure/scripts/{fetch-itch-assets,itch-library}.mjs`.
- GenAI port: `~/src/jbcom/maga-money-moves/src/sim/genai/*` (Google Gemini: `gemini-3.5-flash` text, `imagen-4.0-fast-generate-001` images, `GEMINI_API_KEY`).
- Assets: `/Volumes/home/assets/{2DLowPoly,2DPhotorealistic,Audio}` (exact casing; assets-library MCP is 3D-only, use filesystem for these). Picks: polyhaven `red_sand`, Kenney `UI Pack - Sci-fi`, `Pixel Vehicle Pack` (rover), `Planets`, `Sketch Desert`/`Hexagon`, `Sci-Fi Sounds` SFX, ambient music (`Space Cadet.ogg`, Panchout `Exploration/Tense`).

---

## Queue — Milestone 1: Foundation & house dialect (branch: feat/m1-foundation)

### m1-name Rename to "Martian Trail"
- [x] m1-name-1 Adopt the name **Martian Trail** across package.json (`name: martian-trail`), index.html `<title>`, App boot copy, README, CLAUDE.md pitch. Keep `Gemini-…md` + `red_mars_…html` as historical source files (do not rename those). [done 4792223 — README + depot title; also fixed canvas-0-height collapse; remaining black-paint bug under stuck-loop-debugger]

### m1-tool Toolchain to house baseline
- [x] m1-tool-1 Bump ENTIRE toolchain to latest (user: "run everything to latest, stop using old packages"): Svelte 5.56, Vite 8.1, Vitest 4.1, Pixi 8.19, Capacitor 8.4, TS 6, Biome 2.5, @types/node 26. Biome 2.x config migrated + scoped. Android regenerated under Cap 8, cap:sync verified. [done c2f253f] NOTE: this surfaced intentional RED = the decomposition punch-list (NOT to be suppressed — see [[red-is-the-map-no-shortcut-green]]): Renderer.ts Pixi 7→8 API breaks (BLEND_MODES, async Application.init, beginFill→graphics API, baseTexture destroy) → fixed in render decomposition; App.svelte buyItem key narrowing → fixed in GameState refactor; ~14 biome findings (noExplicitAny untyped Pixi objects, etc) → fixed properly during decomposition.
- [x] m1-tool-2 Fix `.env.example` `GEMINI_API_KEY` placeholder bug. [verified already correct — `GEMINI_API_KEY=your_gemini_api_key_here`; no change needed]

### m1-vite vite/test config for Pages + device
- [x] m1-vite-1 Add `base` handling to vite.config.ts (conditional on `CAPACITOR` / `GITHUB_PAGES`, default `/`, pages `/martian-trails/`). Add `build:pages` + `build:native` scripts. [done 815995e — verified all three base modes emit correct asset paths]
- [ ] m1-vite-2 Create the real vitest browser config (`@vitest/browser-playwright`, chromium, `screenshotFailures:true`, `fileParallelism:false`, GPU/SwiftShader args, headless CI-driven). Fix `test:browser` script (currently references nonexistent `vitest.workspace.ts`). Add a `tests/browser/` smoke test that drives the real UI through the store.
- [ ] m1-vite-3 Upgrade playwright e2e to serve the built `dist/` under the Pages subpath (agofa `serve.mjs` pattern); `trace:retain-on-failure`, `screenshot:only-on-failure`.

### m1-cap Capacitor wiring
- [x] m1-cap-1 Add `capacitor.config.ts` (`appId: com.jbcom.martiantrail`, `appName: Martian Trail`, `webDir: dist`, `androidScheme: https`, mobile-safe-area config). Add `cap:sync`, `cap:run:android`, `android:debug` scripts. Run `pnpm cap:sync` and commit the `android/` dir. [done 9513087 — @capacitor/android@6, android/ committed, cap:sync 'Sync finished']

### m1-ci CI/CD to ci → release → cd (THREE workflows, no separate release-please — mean-streets dialect)
- [x] m1-ci-1 `ci.yml` = PR gate: core (check/lint/test/build), browser (xvfb+chromium), e2e-smoke. SHA-pinned, Node 22. [done c64a3cd]
- [x] m1-ci-2 `release.yml` = push:main: release-please INLINE (no separate workflow) + release-gated APK + provenance web bundle. [done c64a3cd]
- [x] m1-ci-3 (folded into release.yml above — APK assembleRelease + clobber upload + attest-build-provenance web zip). [done c64a3cd]
- [x] m1-ci-4 `cd.yml` = push:main: release-checks + real Pages deploy (configure-pages/upload-pages-artifact/deploy-pages) + debug APK. [done c64a3cd]

### m1-docs Doc set
- [x] m1-docs-1 AGENTS.md, STANDARDS.md, CHANGELOG.md, docs/{STATE,TESTING,DEPLOYMENT,ART-DIRECTION}.md, .github/copilot-instructions.md. (README, ARCHITECTURE, GAME-DESIGN ✓ earlier.) DESIGN-SYSTEM.md deferred to m2-1. [done — doc set complete]

---

NOTE: Milestones below are the UNIFIED production build (user mandate: it's all one effort, no shortcuts, full Oregon-Trail mechanical equivalency, real art not procedural, responsive phone/tablet/foldable). Architecture is `docs/ARCHITECTURE.md`; the loop + mechanic map is `docs/GAME-DESIGN.md`. Decomposition (M3) is the FOUNDATION the loop (M5) is built on, so it comes first; the depot-black regression is fixed by the per-screen render decomposition, not a patch.

## Queue — Milestone 2: Design system, tokens & fontography (branch: feat/m2-design) — DONE
- [x] m2-1 `docs/DESIGN-SYSTEM.md` (UNOMA Field Ops UI language) + `docs/ART-DIRECTION.md` (3DLowPoly Kenney Space, ortho side-view). [done DESIGN-SYSTEM 81c22a3, ART-DIRECTION earlier]
- [x] m2-2 Self-hosted Rajdhani/Inter/JetBrains Mono via @fontsource (no Google CDN). `src/styles/fonts.css`. Verified Rajdhani wordmark in Safari. [done 81c22a3]
- [x] m2-3 `src/styles/tokens.css` (full @theme token set) + typed `src/styles/tokens.ts` mirror (+ 0x hex for Three) + `tokens.test.ts` sync test (11 assertions). [done 81c22a3]

## Queue — Milestone 3: Architecture decomposition — the foundation (branch: feat/m3-arch)
Stack swap DONE (one effort, cheapest moment): **React 19 + R3F + drei + @react-three/postprocessing + framer-motion + Tailwind v4**, Three.js ortho side-view 3D GLB (per docs/ART-DIRECTION.md). Svelte + Pixi removed; dead POC source deleted; minimal R3F boot shell renders (verified in Safari). Now adopt the blobolines skeleton + agofa content/config + koota on top.
- [x] m3-1 Production libs added: koota, seedrandom, howler, zod, zustand, @capacitor/{preferences,haptics,screen-orientation,device}. [done 70e737b] (sim/render/state/content/config/audio/platform/schemas/ui scaffolded as each lands.)
- [x] m3-2 `src/core/rng.ts` (createRng facade) + `src/core/screens.ts` (SCREENS union) + `src/engine/loop.ts` (fixed-timestep advance + alpha). 27 unit tests, deterministic. [done 70e737b]
- [ ] m3-3 `src/sim/**` PURE: port resource/sol/crew-trait/terrain/thermal/scoring math (from the frozen POC HTML + git history) into koota traits + `systems/*` + hand-ordered `tick.ts`. No three/react/DOM, no Math.random/performance.now (gates enforce). Unit tests per system.
- [ ] m3-4 `src/render/**` R3F scenes: drei `<OrthographicCamera>` rig + GLTF loaders + `@react-three/postprocessing` pipeline (bloom/AO/grade); per-screen scenes (garage/depot, travel, …) reading the sim via the `state/diagnostics.ts` frame-cadence bridge (read in `useFrame`, NOT React state). Fixes depot-black (each screen draws its own scene).
- [ ] m3-5 `src/audio/**` howler wrapper + symbolic audio manifest (port the procedural synth as a fallback until real audio lands). `src/state` zustand store (screen/phase/settings/run-summary) + plain-object diagnostics bridge.
- [ ] m3-6 `src/ui/**` React screens as the const-union router (depot/travel/outpost/event/hazard/eva/terminus/gameover) + framer-motion transitions, reading only the store. Rewrite the e2e/browser tests for the new DOM. Green build + check + unit + browser smoke; Safari playtest each screen (frontmost+visible).

## Queue — Milestone 4: Asset & content pipelines (branch: feat/m4-pipelines)
- [ ] m4-1 Port the REAL two-stage itch flow from a-good-old-fashioned-adventure (owned-keys cache, ALLOW_LIST of Martian Trail's purchased packs, Bearer auth, hardened curl, raw-assets→extract, idempotent).
- [ ] m4-2 Local `/Volumes/home/assets` curate path, correct casing (`2DLowPoly`/`2DPhotorealistic`/`Audio`); plus 3DPSX GLBs via assets-library MCP if the art direction uses them. Curate chosen scene assets → `public/assets/` + `MANIFEST.json` + integrity test (refuse unmanifested).
- [ ] m4-3 Port the GenAI pipeline from maga-money-moves: `@google/genai`, `gemini-3.5-flash` (events), `imagen-4.0-fast-generate-001` (crew portraits), prompt/facet builders, zod validate gate, fs cache. Events→`src/content/events/*.json`; portraits→`public/assets/generated/portraits/`.

## Queue — Milestone 5: The complete Oregon-Trail-equivalent loop (branch: feat/m5-loop)
Build the full loop ON the M3 structure, mechanic-by-mechanic per docs/GAME-DESIGN.md. Each = content (JSON) + sim system + render scene + UI + tests + Safari playtest.
- [ ] m5-1 Boot → **Sponsor/difficulty select** (Oregon Trail profession analog: starting CR + score multiplier) → crew select. (POC has none — flat 25k.)
- [ ] m5-2 **Provisioning depot** done right: 25,000 CR enforced in the store (single source of truth, kill dual-qty-mutation), payload cap, missing-vitals launch warning, content-driven stock. Fixes the budget regression.
- [ ] m5-3 **Travel core**: pace×rations tradeoff, Sol/distance on the fixed-timestep clock, per-Sol consumption w/ crew traits, solar recharge, hull wear, terrain zones (incl. the dead-ref `Hardpan Rock` defined), thermal + heater drain, **calendar/deadline pressure** (Oregon Trail "before winter" analog).
- [ ] m5-4 **Hazard Traverse** (RIVER-CROSSING equivalent — the signature tension decision; POC's biggest gap): a family of named impassable terrain (crevasse/chasma, dust-storm wall, regolith bog, ice sheet, canyon scarp), each a multi-option risk decision (Ford/Bridge/Detour/Winch) with a "read" gauge, distinct cost axes, and an animated consequence.
- [ ] m5-5 **EVA Prospecting** (HUNTING equivalent — interactive minigame, not one dice roll): O₂-as-ammo clock, aimed scanner cone w/ hot-cold feedback, drill timing minigame, salvage/sample clicks, carry cap, over-stay injury roll.
- [ ] m5-6 **Outposts/forts + supply**: dock animation, rest (heal+morale), content-driven services + trade, **colonist lore/news** (fort "news" analog). Plus Nomadic Prospector mid-trail trade encounter.
- [ ] m5-7 **Events**: restore + expand to a real pool — Crevasse, Global Dust Storm (restore the dark dust-storm weather system + visuals), Extreme Cold Snap, Dust Devil, Solar Flare, Abandoned Cache, Seal Failure — declarative content + effects.
- [ ] m5-8 **Crew depth**: passive traits + **active abilities** (Rally/Jury-Rig/Deep Prospect/Emergency Harvest), morale + desertion, **typed illnesses tied to cause** (Radiation←flare / Regolith Lung←dust / Fracture←grueling / Hypothermia←cold) with progression + treatment + visible portrait reactions.
- [ ] m5-9 **Upgrades**: O2 scrubbers / suspension / high-yield solar + Micro-Hydroponics (+rations/Sol) + Aerogel Insulation as its own upgrade (un-overload `solar`).
- [ ] m5-10 **Terminus + scoring** (UNOMA rating w/ sponsor multiplier, survivors, cargo, Sols) + **typed death/game-over** screens (tombstone analog) + **save/continue** (Capacitor preferences). High-score persistence.

## Queue — Milestone 6: Art/audio integration, responsive polish, ship (branch: feat/m6-polish)
- [ ] m6-1 Replace procedural graphics with the curated real art (per ART-DIRECTION: 2D sprite and/or 3DPSX-side-view) across every scene — rover, garage/depot, trail backdrop, hazard terrain, EVA surface, outpost, crew portraits. Safari playtest each (frontmost+visible), READ screenshot vs DESIGN-SYSTEM reference; must not look worse than the POC.
- [ ] m6-2 Real audio via howler: engine/airlock/comms SFX (Sci-Fi Sounds), ambient music loops, win/lose jingles, mixing/ducking; audio-graph test.
- [ ] m6-3 **Responsive across phone / tablet / unfolded foldable**: container/viewport breakpoints, safe-area insets, touch-primary, Pixi resize to live canvas, HUD reflow (stacked→side→wide-rails). Verify each form factor via Safari at the three viewport classes + on-device cap:run:android.
- [ ] m6-4 Juice & polish: motion transitions between screens, camera-shake, particle/weather VFX, haptics, critical-alarm overlay, loading/preload.
- [ ] m6-final Definition of done: full green (lint, check, unit, browser, e2e-deployed, build, APK); Pages live at jonbogaty.com/martian-trails/; docs/STATE.md current; full playable run boot→sponsor→depot→trail→hazard→eva→outpost→terminus verified in Safari with screenshots read; on-device APK runs.
