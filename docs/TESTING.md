---
title: Testing
updated: 2026-06-23
status: current
domain: quality
---

# Martian Trail — Testing

## Tiers
- **Unit** (`tests/unit/**`, `pnpm test`) — Vitest, node/jsdom. The pure `src/sim/**`
  systems, config loaders, scoring, RNG determinism. Fast; runs on every commit.
- **Browser** (`tests/browser/**`, `pnpm test:browser`) — Vitest `@vitest/browser-playwright`
  + `vitest-browser-svelte`, real Chromium. Drives the UI through the store; asserts game
  state and rendered DOM, not raw pixels.
- **E2E** (`tests/e2e/**`, `pnpm e2e`) — Playwright against the built bundle (served under the
  Pages subpath). Full-journey smoke: depot → trail → … → terminus.

## Determinism
Sim tests seed `createRng` and assert reproducible outcomes. No wall-clock or `Math.random`
in `src/sim`/`src/engine` (gates enforce). Same seed → same run.

## Visual verification (mandatory, not a tier you can skip)
Render/UI/asset changes are verified by running the game and **reading the screenshot** vs the
`docs/DESIGN-SYSTEM.md` reference. Via the Safari skill: bring the window genuinely frontmost
and assert `document.visibilityState === "visible"` BEFORE capturing — a hidden tab screenshots
all black (WebKit blanks hidden-tab compositing), which is a measurement artifact, not a bug.

## Content & config integrity
`src/content/**` and `src/config/**` are validated against zod schemas (`src/schemas`) in unit
tests — dangling IDs / schema drift fail CI. Curated assets must appear in `public/assets/MANIFEST.json`
(`tests/unit/asset-manifest.test.ts` refuses unmanifested assets).

## CI
`ci.yml` runs core (check/lint/test/build), browser (xvfb+chromium), and e2e-smoke on every PR.
