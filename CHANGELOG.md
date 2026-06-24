# Changelog

All notable changes to Martian Trail are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions are managed by release-please; do not hand-edit version numbers.

## [Unreleased]

### Added
- Martian Trail branding (name, depot title screen) and a project README.
- Vite `base` handling for GitHub Pages (`/martian-trails/`) and Capacitor (`./`) targets,
  with `build:pages` / `build:native` scripts.
- Capacitor 8 Android platform (`capacitor.config.ts`, committed `android/` project,
  `cap:sync` / `cap:run:android` / `android:debug` scripts).
- Three-workflow CI: `ci.yml` (PR gate), `release.yml` (release-please + APK/web on release),
  `cd.yml` (GitHub Pages deploy + debug APK on `main`). All actions SHA-pinned, Node 22.
- `docs/ARCHITECTURE.md` and `docs/GAME-DESIGN.md` — the structural contract and the
  Oregon-Trail→Mars mechanical-equivalency map.
- `AGENTS.md` operating doctrine.

### Changed
- Bumped the entire toolchain to latest: Svelte 5, Vite 8, Vitest 4, PixiJS 8, Capacitor 8,
  TypeScript 6, Biome 2 (config migrated to the 2.x schema).
- Fixed the PixiJS canvas collapsing to 0 height when its container reported 0 height at mount.
