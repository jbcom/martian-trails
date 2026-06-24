# AGENTS.md — Martian Trail operating protocols

Operational doctrine for agents working this repo. Identity, commands, and profile
includes live in `CLAUDE.md`; this file is the *how we build* contract.

## The bar
A complete, fun, polished game with **real mechanical equivalency to Oregon Trail** but
Martian equivalents — a full loop boot→terminus, not a thin one. Modern and polished
(2026, not 1990). Playable across **phone, tablet, and unfolded foldable**. The current
implementation must never look or play *worse* than the POC (`red_mars_the_ares_trail.html`).

## Order of work
**Docs → Tests → Code.** Document the behavior (`docs/*`), write the failing test, implement.
Spec wrong? Revise the spec → test → resume. Never let code drift from spec silently.

## Architecture is the default
- `docs/ARCHITECTURE.md` is the structural contract: `src/{core,engine,sim,render,state,content,config,audio,platform,styles,ui,schemas}`.
- **Sim purity:** `src/sim/**` is pure TS — no pixi/svelte/DOM imports, no `Math.random()`
  (use `createRng(seed)`), no `performance.now()` (use the engine clock). Enforced by
  `.claude/gates.json`.
- **Bridge by cadence:** sim→render via the frame-cadence `state/diagnostics.ts` plain object;
  UI reads the zustand store (human cadence) and **never touches Three objects**.
- **Screens are a `const`-union router**, not one enum-gated `update()`. Each screen owns its
  render scene. (This is *the* fix for the depot-black regression.)
- **Content over code:** events, depot stock, outpost services, hazards, dialogue, crew live
  as JSON in `src/content/**`, interpreted by generic engines. "Code interprets content,
  never embeds it." Tunables live in `src/config/*.json`. Validate with zod (`src/schemas`).

## Red is the map — no shortcut green
Failing lint/typecheck/tests are intentional signposts to what's next. **Never** manufacture
green via blanket autofix (`--unsafe`), rule-disabling, `as any`, `biome-ignore`, or deleting
assertions — it loses the signal and can introduce bugs (a `--unsafe` `parseInt` "fix" once
broke hex-color parsing here). Fix the cause, or recognize the red as a queued signpost.

## Visual verification is mandatory
Every render/UI/asset change: run the game, screenshot, **READ your own screenshot**, compare
against the named reference in `docs/DESIGN-SYSTEM.md`, fix before commit. "Tests pass" ≠
"app runs". Playtest via the **Safari skill** (Chrome is in use by someone else). Critical:
bring the Safari window genuinely frontmost (`System Events → set frontmost`) and assert
`document.visibilityState === "visible"` BEFORE screenshotting — a hidden tab captures all
black (WebKit blanks hidden-tab compositing); it is not a render bug.

## Workflow
- pnpm only. Conventional Commits. One branch per milestone, layered forward commits, one PR
  at the end, squash-merge once green. Never commit to `main` directly.
- The work queue is `.agent-state/directive.md`. Mark `[x]` only after a backward+forward sweep.
- After each commit, dispatch reviewers (parallel, background, scoped to the diff); fold
  findings forward.

## Commands
`pnpm dev` · `pnpm build` (`build:pages` / `build:native`) · `pnpm check` · `pnpm lint` ·
`pnpm test` · `pnpm test:browser` · `pnpm e2e` · `pnpm cap:sync` · `pnpm cap:run:android`.
