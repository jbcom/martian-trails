---
title: Martian Trail
updated: 2026-06-23
status: current
domain: product
---

# Martian Trail

**Martian Trail** is an *Oregon Trail*–style survival game set on a hard-science-fiction
Mars. You command a pressurized rover hauling four colonists ~2,500 km across the
regolith — from the **Underhill Depot** to **Korolev Crater** — rationing oxygen, water,
power, and spare parts against dust storms, solar flares, hull failures, and the slow
grind of crew morale. It's the Ares Trail: a battle of attrition under a rust-colored sky.

Built with **React + React-Three-Fiber** (Three.js, orthographic side-view 3D) on **Vite**,
packaged for **Android** via **Capacitor**, with a diegetic glassmorphic Mars-ops interface.

## Play

The web build deploys continuously to GitHub Pages:
**https://jonbogaty.com/martian-trails/**

## Develop

```sh
pnpm install
pnpm dev            # vite dev server
pnpm check          # tsc --noEmit typecheck
pnpm lint           # biome
pnpm test           # unit (node/jsdom)
pnpm test:browser   # real Chromium (vitest browser)
pnpm e2e            # playwright against the built bundle
pnpm build          # production build
```

### Android

```sh
pnpm cap:sync       # sync the web build into the android project
pnpm cap:run:android
```

### Asset & content pipelines

- `pnpm assets:fetch` — pull purchased itch.io packs / curate local library assets.
- `pnpm genai:events` / `pnpm genai:portraits` — Gemini-driven event & crew-portrait
  generation (requires `GEMINI_API_KEY`). See `.env.example`.

## Design

The game premise and full feature history live in
`Gemini-Red_Mars_Oregon_Trail_Game_Concept.md`; the original single-file prototype is
`red_mars_the_ares_trail.html`. The visual language is documented in
`docs/DESIGN-SYSTEM.md`. Current shipped reality is tracked in `docs/STATE.md`.

## License

See `LICENSE`.
