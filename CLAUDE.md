<!-- profile: arcade-game agent-state mobile-android standard-repo v1 -->
# martian-trail

An Oregon-Trail-style Mars survival game — Svelte + PixiJS on Vite, packaged for Android via Capacitor.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/arcade-game.md
@/Users/jbogaty/.claude/profiles/agent-state.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Repo-specific

- **Run:** `pnpm dev` (vite dev server)
- **Test:** `pnpm test` (vitest, node+jsdom) · `pnpm test:browser` · `pnpm e2e` (playwright)
- **Lint:** `pnpm lint` (biome) · `pnpm lint:fix`
- **Typecheck:** `pnpm check` (svelte-check)
- **Build:** `pnpm build` (vite build)
- **Deploy:** Android via Capacitor (`@capacitor/core` 6.x) — see profile; `pnpm cap:sync` after capacitor/android changes

## Notes

- Stack: Svelte 4 + PixiJS 7 + Vite 5; Biome (not ESLint/Prettier); pnpm (not npm/yarn).
- GenAI content pipeline: `pnpm genai:events` / `pnpm genai:portraits` (tsx scripts in `scripts/`), `pnpm assets:fetch` pulls itch.io assets. Needs env — see `.env.example`.
- Source today lives in `src/lib/` (`GameState.ts`, `Renderer.ts`, `AudioEngine.ts`); gates.json globs (`src/sim`, `src/render`, `src/audio`) are forward-looking — refactor toward them as the engine grows.
- Design concept: `Gemini-Red_Mars_Oregon_Trail_Game_Concept.md`. Original prototype: `red_mars_the_ares_trail.html`.
- **Not a git repo yet** — `git init` before continuous work; release-please config is present but no remote.
