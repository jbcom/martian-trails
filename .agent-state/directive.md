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
- [ ] m1-docs-1 Add `AGENTS.md` (operational doctrine: docs>tests>code, content-first, browser validation mandatory). Add `README.md`, `CHANGELOG.md`, `STANDARDS.md`. Add `docs/{ARCHITECTURE,STATE,DESIGN-SYSTEM,TESTING,DEPLOYMENT}.md`. Frontmatter per standard-repo profile.

---

## Queue — Milestone 2: Design system, tokens & fontography (branch: feat/m2-design)

### m2-design Visual language
- [ ] m2-design-1 Write `docs/DESIGN-SYSTEM.md`: name the Martian Trail visual language (diegetic glassmorphic Mars-ops HUD), reference screenshots, palette (deep rust/ochre/iron-oxide; the POC's `--mars-bg #1a0b08 / --mars-red #8a3324 / --mars-dust #cc7052 / --mars-sand #e89b71` as the seed), motion grammar, glass-panel spec, alarm/critical states.
- [ ] m2-design-2 Choose fontography (display + body; itch/Kenney Fonts or @fontsource — a condensed techy display like Rajdhani/Orbitron-class + a clean body). Wire `src/styles/fonts.css`.
- [ ] m2-token Token files
- [ ] m2-token-1 `src/styles/tokens.css` (CSS custom props: color/space/type/radius/glass-blur) + typed `src/styles/tokens.ts` mirror + `tokens.test.ts` sync test (house pattern). Migrate global.css + App.svelte styles onto tokens.

---

## Queue — Milestone 3: src refactor to house layout (branch: feat/m3-refactor)

### m3-split Split src/lib → sim/render/audio/state/content/config
- [ ] m3-split-1 Move pure simulation (resource math, sol consumption, crew traits, terrain/thermal, scoring) into `src/sim/**` — pure TS, no DOM, no Math.random (use a seeded `createRng` facade), no `performance.now` (engine clock facade). Satisfies gates.json sim-purity.
- [ ] m3-split-2 Move PixiJS into `src/render/**`; AudioEngine into `src/audio/**`; the Svelte store bridge into `src/state/**`; tunables into `src/config/*.json`; event/outpost/store/trade/log content into `src/content/**` (JSON, "code interprets content, never embeds it").
- [ ] m3-split-3 Update `$lib` aliases / imports; ensure every folder has co-located tests; green build + tests + browser smoke after the move (refactor in one commit per CLAUDE.md — callers move with the module).

---

## Queue — Milestone 4: Asset & content pipelines (branch: feat/m4-pipelines)

### m4-itch itch downloader (real)
- [ ] m4-itch-1 Port the real two-stage itch flow from a-good-old-fashioned-adventure (owned-keys cache via itch-library.mjs, ALLOW_LIST, Bearer auth, hardened curl, raw-assets→extract, idempotent). Decide ALLOW_LIST for Martian Trail's purchased packs.
- [ ] m4-local Local NAS asset pipeline
- [ ] m4-local-1 Build the `/Volumes/home/assets` copy/curate path with **correct casing** (`2DLowPoly`,`2DPhotorealistic`,`Audio`). Curate the chosen Mars assets into `public/assets/` with a `MANIFEST.json` + integrity test (`tests/unit/asset-manifest.test.ts` refusing unmanifested assets).
### m4-genai GenAI pipeline (real)
- [ ] m4-genai-1 Port the Gemini engine from maga-money-moves: `@google/genai`, `gemini-3.5-flash` for events, `imagen-4.0-fast-generate-001` for crew portraits, prompt/facet builders, validate gate, filesystem cache. Events→`src/content/events/*.json`; portraits→`public/assets/generated/portraits/`. Generate the 4 crew portraits (John/Maya/Frank/Nadia) + an expanded event pool.

---

## Queue — Milestone 5: Game systems — fix regressions, then actualize (branch: feat/m5-systems)

### m5-fix Fix scaffold regressions (single source of truth)
- [ ] m5-fix-1 Budget: 25,000 CR, enforced inside the store (not the component); kill the dual-mutation of STORE_ITEMS.qty; unit-test the buggy budget path.
- [ ] m5-fix-2 Restore the dust-storm weather system (state is never set in scaffold) + storm visuals; restore POC's 3 base events (Crevasse, Global Dust Storm, Extreme Cold Snap) and keep Dust Devil as a 4th.
- [ ] m5-fix-3 Remove dead refs / define them properly: `Hardpan Rock` terrain zone, `thermal`/Aerogel upgrade as its own upgrade (un-overload `solar`). Add missing-vitals launch warning, visual critical-alarm overlay, boulder-field obstacle spawner.
### m5-feat Actualize concept-only systems
- [ ] m5-feat-1 Active crew abilities (Rally / Jury-Rig / Deep Prospect / Emergency Harvest) with Sol/resource costs.
- [ ] m5-feat-2 Micro-Hydroponics (+rations/Sol) + Aerogel Insulation upgrades wired to sim.
- [ ] m5-feat-3 Distinct disease typing tied to cause (Radiation←flare / Regolith Lung←dust / Fracture←grueling / Hypothermia←cold) with progression + death.
- [ ] m5-feat-4 Expanded event pool (Solar Flare Outburst, Abandoned Supply Cache, Seal Failure) + Nomadic Prospector mid-trail trade encounter + colonist lore at outposts.

---

## Queue — Milestone 6: Art/audio integration & polish (branch: feat/m6-polish)

### m6-art Asset integration
- [ ] m6-art-1 Integrate curated 2D/photoreal textures (red_sand regolith, sci-fi UI panels) + crew portraits into the render/UI; keep the diegetic glass airlock direction. Playtest each via Safari, READ screenshot vs DESIGN-SYSTEM reference.
- [ ] m6-audio-1 Layer real audio (Sci-Fi Sounds for engine/airlock/comms, ambient music loops, win/lose jingles) alongside or replacing the procedural synth where it improves feel; audio-graph test.
- [ ] m6-mobile-1 Mobile-first pass: touch input primary, safe-area insets, Pixel-5a render budget. Verify on-device via cap:run:android (or document the gate if no device).

### m6-final Definition of done
- [ ] m6-final-1 Full green: lint, typecheck, unit, browser, e2e-deployed, build, APK. Pages live at jonbogaty.com/martian-trails/. docs/STATE.md reflects shipped reality. App RUNS (Safari playtest, full run depot→trail→outpost→victory, screenshots read).
