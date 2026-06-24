# Changelog

All notable changes to Martian Trail are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions are managed by release-please; do not hand-edit version numbers.

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

