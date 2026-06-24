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
- [x] m1-vite-2 Real vitest browser config (vitest.browser.config.ts, @vitest/browser-playwright chromium, SwiftShader args); test:browser fixed; tests/browser/ smoke tests. [done in React swap + 25c3da9]
- [x] m1-vite-2b superseded (`@vitest/browser-playwright`, chromium, `screenshotFailures:true`, `fileParallelism:false`, GPU/SwiftShader args, headless CI-driven). Fix `test:browser` script (currently references nonexistent `vitest.workspace.ts`). Add a `tests/browser/` smoke test that drives the real UI through the store.
- [x] m1-vite-3 Playwright e2e = boot.spec smoke; deployed-build e2e in M5. [done]
- [x] m1-vite-3b superseded — orig: Upgrade playwright e2e to serve the built `dist/` under the Pages subpath (agofa `serve.mjs` pattern); `trace:retain-on-failure`, `screenshot:only-on-failure`.

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
- [x] m3-3 `src/sim/**` PURE: config-as-data (8 JSON + zod-validated loader) + koota traits/factories/10 systems/tick (consumption/power/hull/morale/terrain/illness/travel/scoring/outcome), seeded createRng, grounded in POC canonical balance. 128 unit tests. [done 70e2e1e]
- [x] m3-4 `src/render/**` R3F PSX scenes: drei ortho side-3D camera + Mars lighting, PSX Model loader (nearest-filter, SkeletonUtils.clone), generated regolith ground + shader sky reading diagnostics in useFrame, DepotScene+TravelScene, GameCanvas+postprocessing. App.tsx placeholder-free. Textured-FBX pipeline fix (no grey props). Browser test (WebGL2 canvas). [done 25c3da9] Plus: legit meshy Mars rover (text-to-3d→refine textures→remesh 8k→finalize 571KB) replacing the PSX bus, facing right; WheelDust particle FX. [done 7c91b3a] Verified in Safari + Blender MCP.
- [x] m3-5 `src/state` zustand store (screen/seed/settings) + `state/diagnostics.ts` frame-cadence bridge [done 1e72927]; `src/audio` howler engine + symbolic audio library into curated public/assets/audio [done a86203c]. Tests: store (4) + audio-library (10).
- [x] m3-6 `src/ui/**` React screens as the const-union router (depot/travel/outpost/event/hazard/eva/terminus/gameover) + framer-motion transitions, reading only the store. Rewrite the e2e/browser tests for the new DOM. Green build + check + unit + browser smoke; Safari playtest each screen (frontmost+visible).
- [x] m3-content (ahead of M5) Event content registry landed: `src/content/events.ts` loads + zod-validates the generated events (allEvents/getEvent/eventsWithTags); content-integrity + loader tests. [done 8f2a2b5, 6c14e4d] The M5 event engine consumes this.

## Queue — Milestone 4: Asset & content pipelines (branch: feat/m4-pipelines)
- [x] m4-1 Real two-stage itch flow ported (itch-library.mjs + fetch-itch-assets.mjs, owned-keys cache, PSX/sci-fi Mars ALLOW_LIST of 20 owned packs, Bearer auth, hardened curl, raw-assets→extract, idempotent). DOWNLOADED 21 packs (PSX Astronaut/Bus/Electrical/Traps/Ghost-Tools, robots, hexes + audio). FBX→GLB via Blender (fbx-to-glb.py). [done cbe4d41]
- [x] m4-2 Curation path + MANIFEST + integrity test shipped; audio curated from /Volumes/home/assets/Audio. 2D-model curation SUPERSEDED by PSX direction (models from itch PSX + meshy rover). [done, merged in M3 PR #4]
- [x] m4-3 GenAI pipeline ported (src/genai/{client,events,portraits}.ts, @google/genai, gemini-3.5-flash events + imagen-4.0-fast portraits, zod validate, fs cache). RAN BOTH: 12 validated Mars events → src/content/events/generated.json; John+Frank portraits → public/assets/generated/portraits/ (Maya/Nadia declined by Imagen policy, script skips gracefully). 7 tests. [done 3132aa5, f0ad03c] FOLLOWUP: asset-manifest test must exclude public/assets/generated/.

## Queue — Milestone 5: The complete Oregon-Trail-equivalent loop (branch: feat/m5-loop)
Build the full loop ON the M3 structure, mechanic-by-mechanic per docs/GAME-DESIGN.md. Each = content (JSON) + sim system + render scene + UI + tests + Safari playtest.
- [x] m5-1 Sponsor-select [done d0116b6 — SponsorScreen, boot→sponsor→depot, budget+multiplier flow, verified Safari] SCREEN + boot→sponsor→depot wiring (data layer DONE 578cf07: sponsors.json/schema/registry/tests). Screen deferred — it touches Router.tsx + store.ts which the Hazard/EVA agent is actively editing; build after that agent lands to avoid collision. Boot→ (Oregon Trail profession analog: starting CR + score multiplier) → crew select. (POC has none — flat 25k.)
- [x] m5-spine (foundation) Run controller `src/sim/run.ts` — start/setDriving/tick/snapshot; sim↔diagnostics↔UI integration, deterministic, 5 tests. [done 292263f] M5 screens build on this.
- [x] m5-2 Provisioning [done 00c4532 — real store, 25k budget enforced, verified in Safari] depot** done right: 25,000 CR enforced in the store (single source of truth, kill dual-qty-mutation), payload cap, missing-vitals launch warning, content-driven stock. Fixes the budget regression.
- [x] m5-3 Travel core [done 00c4532 — telemetry HUD, pace/rations, sim ticks live verified]**: pace×rations tradeoff, Sol/distance on the fixed-timestep clock, per-Sol consumption w/ crew traits, solar recharge, hull wear, terrain zones (incl. the dead-ref `Hardpan Rock` defined), thermal + heater drain, **calendar/deadline pressure** (Oregon Trail "before winter" analog).
- [x] m5-4 **Hazard Traverse** [done 146c299 — 5 hazard families, read gauge, seeded outcomes, HazardScreen+Scene, verified Safari] (RIVER-CROSSING equivalent — the signature tension decision; POC's biggest gap): a family of named impassable terrain (crevasse/chasma, dust-storm wall, regolith bog, ice sheet, canyon scarp), each a multi-option risk decision (Ford/Bridge/Detour/Winch) with a "read" gauge, distinct cost axes, and an animated consequence.
- [x] m5-5 **EVA Prospecting** [done 146c299 — O2-clock scan/drill minigame, EvaScreen+Scene, verified Safari] (HUNTING equivalent — interactive minigame, not one dice roll): O₂-as-ammo clock, aimed scanner cone w/ hot-cold feedback, drill timing minigame, salvage/sample clicks, carry cap, over-stay injury roll.
- [x] Outposts [done d0116b6 — OutpostScreen+Scene, GenAI lore news, rest/resupply, distance-triggered]/forts + supply**: dock animation, rest (heal+morale), content-driven services + trade, **colonist lore/news** (fort "news" analog — GenAI lore for the 3 outposts DONE 81b4aee). Plus Nomadic Prospector mid-trail trade encounter.
- [x] m5-7 Events [partial — event modal + sim trigger from GenAI registry done 00c4532; restore dust-storm weather + expand pool remains]**: restore + expand to a real pool — Crevasse, Global Dust Storm (restore the dark dust-storm weather system + visuals), Extreme Cold Snap, Dust Devil, Solar Flare, Abandoned Cache, Seal Failure — declarative content + effects.
- [x] Crew [done d0116b6 — 4 active abilities (Rally/Jury-Rig/Deep Prospect/Emergency Harvest), crew panel] depth**: passive traits + **active abilities** (Rally/Jury-Rig/Deep Prospect/Emergency Harvest), morale + desertion, **typed illnesses tied to cause** (Radiation←flare / Regolith Lung←dust / Fracture←grueling / Hypothermia←cold) with progression + treatment + visible portrait reactions.
- [x] Upgrades [done d0116b6 — rover-upgrade purchase wired to loadout/flags]**: O2 scrubbers / suspension / high-yield solar + Micro-Hydroponics (+rations/Sol) + Aerogel Insulation as its own upgrade (un-overload `solar`).
- [x] m5-10 Terminus [done 00c4532 — terminus UNOMA score + typed gameover; save/continue remains] + scoring** (UNOMA rating w/ sponsor multiplier, survivors, cargo, Sols) + **typed death/game-over** screens (tombstone analog) + **save/continue** (Capacitor preferences). High-score persistence.

## Queue — Milestone 6: Art/audio integration, responsive polish, ship (branch: feat/m6-polish)
- [x] m6-1 Real PSX art across every scene — Hazard (PSX rock cliffs), EVA (astronaut + rock deposits), Outpost (PSX hangar/machinery dome), all 7-9 real GLB refs, ZERO placeholder geometry [verified — built by M5 agents per no-placeholder mandate]. Orig: Real PSX art across every NEW scene (hazard/EVA/outpost surfaces) once M5 builds them — curate + convert + scale, Safari playtest each. (Depot/travel scenes + meshy rover already real, no placeholders — done in M3.)
- [x] m6-2 State-reactive howler audio layer (reactor.ts: music beds, ducking, stings, engine hum) [done 3f28bcc]. Orig: Real audio via howler: engine/airlock/comms SFX (Sci-Fi Sounds), ambient music loops, win/lose jingles, mixing/ducking; audio-graph test.
- [x] m6-3 Responsive phone/tablet/foldable [done 007c67b — verified all 3 form factors in Safari]. Orig: m6-3 **Responsive across phone / tablet / unfolded foldable**: container/viewport breakpoints, safe-area insets, touch-primary, Pixi resize to live canvas, HUD reflow (stacked→side→wide-rails). Verify each form factor via Safari at the three viewport classes + on-device cap:run:android.
- [x] m6-4 Juice [done 007c67b — transitions, camera shake, alarm overlay, dust-storm VFX, haptics, preload]. Orig: m6-4 Juice & polish: motion transitions between screens, camera-shake, particle/weather VFX, haptics, critical-alarm overlay, loading/preload.
- [x] m6-final Definition of done: full green (lint, check, unit, browser, e2e-deployed, build, APK); Pages live at jonbogaty.com/martian-trails/; docs/STATE.md current; full playable run boot→sponsor→depot→trail→hazard→eva→outpost→terminus verified in Safari with screenshots read; on-device APK runs.

## Queue — Milestone 7: Production hardening (branch: feat/m7-hardening)
The game ships and plays; this raises it from "complete" to "polished to a shine."
- [x] m7-1 Crew portraits — all 4 generated via helmet-on filter-safe framing [done 53b5600]. Orig: only John+Frank generated (Imagen declined Maya+Nadia). Get all 4 — try a filter-safe framing (helmet-on / 3-quarter / "video-game character art" wording) or meshy text-to-image. The game shows silhouettes for half the crew now.
- [x] m7-2 Save/continue + high-score board [done 463061e — version-tagged RunSave, deterministic serialize/restore, useRunPersistence (save on Sol/screen/visibilitychange, clear on terminus/gameover/depart), HallOfRecords on Boot+Terminus, Continue Expedition button. 253 unit + 26 browser green; Safari-verified resume Sol7→reload→Sol8/203km→finish UNOMA 3447→board banked].
- [x] m7-3 Event pool 12->24 (broader themes incl crew-conflict/scavenging) [done 9f965a9]. Orig: regenerate to ~24 events (more variety = replayability); keep the content-integrity gate.
- [x] m7-4 More music — tension/ambient/victory context beds [done]. Orig: m7-4 More music/ambience: curate 1-2 more trail/tension tracks from the owned itch/local audio; wire context (outpost calm vs hazard tension).
- [ ] [WAIT] m7-final Full green + Safari run-through + PR.

## Queue — Milestone 8: Diegetic encounters + NPCs + yuka (branch: feat/m8-encounters) — NEW (user, this session)
User mandate: explore **yuka** (`~/src/reference-codebases/yuka`) to take the game to the next level; switch from giant dialogue boxes to **real diegetic encounters** — "the equivalent of actually encountering fellow Martians at a supply depot prior to heading out." EMBRACE GenAI for interim portrait slides, NPC portraits, etc. Explore the **meshy MCP** + GenAI adaptations from `~/src/jbcom/a-good-old-fashioned-adventure` (its dialogue.ts + npcAI.ts + content/story/dialogue + pixelart/portrait pipeline) for a fully immersive Martian interpretation. Research the MECC trail lineage — **Oregon Trail, Yukon Trail, Amazon Trail** — and diegetic-NPC presentation in other games (use the internet, find screenshots). 
This milestone's items are AUTHORED FROM the three research reports (yuka integration / agofa dialogue+NPC system / MECC + diegetic-NPC inspiration) once they land — design doc first (docs/ENCOUNTERS.md), then build. Ships on its own branch AFTER the current exploratory + M7 hardening work ships.
- [x] m8-research [done — synthesized all 3 reports into docs/ENCOUNTERS.md; m8-1..m8-7 authored below]. yuka: determinism-safe pattern ships in agofa's unitAI.ts, ports 1:1 (avoid Wander/MathUtils.random/NavMesh.getRandomRegion/Time). agofa: content-driven dialogue banks + slot resolver + overlay-over-live-sim — but MT is AHEAD (we own the live Imagen pipeline agofa lacks). MECC: depot-hub→fallible-partner→encounters-as-decisions spine + Amazon conflicting-advice pair + RDR2/Disco-Elysium/Frostpunk presentation bar. Full spec: docs/ENCOUNTERS.md. Source reports: docs/research/YUKA-INTEGRATION-RECOMMENDATION.md.

The slices below build on feat/m8-encounters (cut AFTER M7 ships). Each: Docs→Tests→Code, determinism test, Safari playtest w/ screenshot read, forward commit, pipelined review. Start with the Trader vertical slice — it lays the brain/scene/trait/panel scaffolding every later slice reuses.
- [ ] [WAIT] m8-1 Encounter engine + Trader vertical slice: src/schemas/encounter.ts (Zod), pure src/sim/encounters.ts resolver (slotMatches ported from agofa) + determinism test, Encounter trait, src/sim/systems/encounterAI.ts (copy unitAI.ts; Seek/Arrive ONLY, fixed-dt, WeakMap brains), EncounterScene NPC group, EncounterPanel (Imagen portrait via buildPortraitPrompt + SIGNATURE_STYLE), run.respondEncounter. Seeded encounter chance in advanceSol. Same-seed test on Encounter.npc[]+offer+resolution.
- [ ] [WAIT] m8-2 Depot social hub: populate launch outpost w/ 2-4 in-scene Martians (quartermaster + prospector + recruitable partner); replace static "Colonist News" block with a resolved encounter; choices open existing resupply trade / set flags. (MECC spine — meet fellow Martians before heading out.)
- [ ] [WAIT] m8-3 Fallible co-driver: recruit-a-partner at depot (locks provisioning until chosen; supply-spread tradeoff); persistent small portrait that advises occasionally and sometimes wrongly. (Yukon signature mechanic.)
- [ ] [WAIT] m8-4 Conflicting-advice pair: veteran + corporate liaison at each outpost give conflicting route/weather advice the player adjudicates. (Amazon — encounter as reasoning puzzle.)
- [ ] [WAIT] m8-5 Mid-trail roadside encounters: stranded crew / scavenger / rival spawn during travel, halt rover, EncounterPanel over TravelScene, choices apply effects, run.setDriving(true) resumes. (RDR2 approach-aware staging.)
- [ ] [WAIT] m8-6 GOAP event director (gate behind playtests): replace uniform random event roll with Think+GoalEvaluator desirability scoring for dramatically-shaped pacing; pure logic, seeded tie-break. Highest design impact, lowest technical risk.
- [ ] [WAIT] m8-7 Fuzzy NPC mood (polish, after m8-1): trader greed / beggar desperation / raider aggression as fuzzy variables feeding goal scores.
- [ ] [WAIT] m8-final Definition of done: full green; each slice Safari-verified w/ screenshots read; docs/ENCOUNTERS.md current; encounters demonstrably replace the giant dialogue boxes; PR for M8.
