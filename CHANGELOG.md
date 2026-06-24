# Changelog

All notable changes to Martian Trail are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions are managed by release-please; do not hand-edit version numbers.

## [1.1.0](https://github.com/jbcom/martian-trails/compare/martian-trail-v1.0.0...martian-trail-v1.1.0) (2026-06-24)


### Features

* design system + fontography + curated assets (rover renders) ([#3](https://github.com/jbcom/martian-trails/issues/3)) ([8d89ced](https://github.com/jbcom/martian-trails/commit/8d89ced8a8ceedb312983004a2683ad9f5dbb5d2))
* foundation — React/R3F/Three stack, CI/CD, Capacitor, docs ([#1](https://github.com/jbcom/martian-trails/issues/1)) ([df6745f](https://github.com/jbcom/martian-trails/commit/df6745f2498c34925d1848ff589d512264f92ae2))
* M3 — architecture decomposition + PSX render + asset/genai pipelines ([#4](https://github.com/jbcom/martian-trails/issues/4)) ([db97c3d](https://github.com/jbcom/martian-trails/commit/db97c3d61a895bc2364c09416a4311584756942a))
* M5 — the complete Oregon-Trail-equivalent gameplay loop ([#5](https://github.com/jbcom/martian-trails/issues/5)) ([75cdd99](https://github.com/jbcom/martian-trails/commit/75cdd99dbd9539f2d8962956dd97be428e68c6f5))
* M6 — production polish (responsive, juice, audio, dust-storm) ([#6](https://github.com/jbcom/martian-trails/issues/6)) ([ef12b07](https://github.com/jbcom/martian-trails/commit/ef12b071f3b6b013b925979a566e5b15a299f377))

## [Unreleased]

### Changed
- **Stack pivot to the house dialect: React 19 + React-Three-Fiber (drei,
  @react-three/postprocessing, framer-motion) + Three.js (orthographic side-view 3D) +
  Tailwind v4**, replacing the original Svelte + PixiJS scaffold. Render is now declarative
  3D (curated GLB models) with a real post-processing pipeline.
- Bumped the entire toolchain to latest: Vite 8, Vitest 4, Capacitor 8, TypeScript 6,
  Biome 2 (config migrated to the 2.x schema).

### Added
- Martian Trail branding (name, boot title) and a project README.
- React + R3F boot shell rendering the curated rover GLB in an ortho side view.
- Design system: `src/styles/tokens.{css,ts}` (Mars palette, sync-tested) + self-hosted
  Rajdhani/Inter/JetBrains Mono fonts. `docs/DESIGN-SYSTEM.md`, `docs/ART-DIRECTION.md`.
- Curated game assets under `public/assets/` (organized by domain: models/{rover,crew,
  terrain,rocks,outpost,props}, audio/{sfx,music}) with a manifest + integrity test.
- Vite `base` handling for GitHub Pages (`/martian-trails/`) and Capacitor (`./`) targets,
  with `build:pages` / `build:native` scripts.
- Capacitor 8 Android platform (`capacitor.config.ts`, committed `android/` project,
  `cap:sync` / `cap:run:android` / `android:debug` scripts).
- Three-workflow CI: `ci.yml` (PR gate), `release.yml` (release-please + APK/web on release),
  `cd.yml` (GitHub Pages deploy + debug APK on `main`). All actions SHA-pinned, Node 22.
- `docs/ARCHITECTURE.md` and `docs/GAME-DESIGN.md` — the structural contract and the
  Oregon-Trail→Mars mechanical-equivalency map.
- `AGENTS.md` operating doctrine.
