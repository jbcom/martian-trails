<!-- profile: arcade-game agent-state mobile-android standard-repo v1 -->
# martian-trail

An Oregon-Trail-style Mars survival game — React + React-Three-Fiber (Three.js, ortho side-view 3D) on Vite, packaged for Android via Capacitor.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/arcade-game.md
@/Users/jbogaty/.claude/profiles/agent-state.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Repo-specific

- **Run:** `pnpm dev` (vite dev server)
- **Test:** `pnpm test` (vitest, node/jsdom) · `pnpm test:browser` (real Chromium) · `pnpm e2e` (playwright)
- **Lint:** `pnpm lint` (biome) · `pnpm lint:fix`
- **Typecheck:** `pnpm check` (`tsc --noEmit`)
- **Build:** `pnpm build` (`build:pages` for Pages, `build:native` for Capacitor)
- **Deploy:** Pages at jonbogaty.com/martian-trails/ (cd.yml); Android via Capacitor 8 (`pnpm cap:sync` / `cap:run:android`)

## Notes

- **Stack (all latest):** React 19 + @react-three/fiber + drei + @react-three/postprocessing + framer-motion + Three.js (ortho side-view 3D GLB) · Vite 8 · Tailwind v4 · Capacitor 8 · TypeScript 6 · Biome 2 · Vitest 4. pnpm only. (Was Svelte 4 + Pixi 7 — swapped to the house dialect.)
- **Read first:** `docs/ARCHITECTURE.md` (the `src/{core,engine,sim,render,state,content,config,…}` structure + the three load-bearing patterns), `docs/GAME-DESIGN.md` (Oregon-Trail→Mars mechanic map), `docs/ART-DIRECTION.md` (3DLowPoly Kenney Space, ortho side-view), `AGENTS.md` / `STANDARDS.md` (doctrine). The queue is `.agent-state/directive.md`.
- **Sim purity:** `src/sim/**` is pure & deterministic (createRng, no Math.random/performance.now) — `.claude/gates.json` enforces. Content is JSON in `src/content/**`; tunables in `src/config/**`.
- **Playtest:** Safari skill (Chrome is in use by someone else); window frontmost + `visibilityState==="visible"` BEFORE screenshotting (hidden tab captures black).
- Pipelines: `pnpm genai:events`/`genai:portraits` (Gemini), `pnpm assets:fetch` (itch + local `/Volumes/home/assets`). See `.env.example`.
- Provenance: design `Gemini-Red_Mars_Oregon_Trail_Game_Concept.md`; frozen POC `red_mars_the_ares_trail.html` (do not edit — it's the reference + the M3 sim-port source).
