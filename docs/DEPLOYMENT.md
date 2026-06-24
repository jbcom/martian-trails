---
title: Deployment
updated: 2026-06-23
status: current
domain: ops
---

# Martian Trail — Deployment

## Targets & `base`
One bundle serves three origins; `vite.config.ts` resolves `base`:
- **GitHub Pages** (`GITHUB_PAGES=true` → `base: /martian-trails/`) via `pnpm build:pages`.
- **Capacitor / Android** (`CAPACITOR=true` → `base: ./`) via `pnpm build:native`.
- **Dev / preview** (`base: /`) via `pnpm build`.

## Web — GitHub Pages
`cd.yml` (push to `main`): `release-checks` → `deploy-pages` (configure-pages →
upload-pages-artifact `dist` → deploy-pages). Pages is configured with the **workflow** build
type; live at **https://jonbogaty.com/martian-trails/**. Pages tracks `main` continuously.

## Versioned releases
`release.yml` (push to `main`): `release-please` opens/merges the release PR; on
`release_created` it builds the provenance-attested web zip and the Android APK
(`assembleRelease`, signed if `ANDROID_KEYSTORE_*` secrets are set, else debug) and attaches
both to the GitHub Release. Versioning is release-please's job — never hand-edit versions.

## Android
`pnpm cap:sync` (= `build:native` + `cap sync android`) syncs the web build into the committed
`android/` project (Capacitor 8). `pnpm cap:run:android` launches on device/emulator;
`pnpm android:debug` builds the debug APK. `cd.yml` also uploads a debug APK artifact per push.

## Secrets
- `GITHUB_TOKEN` — release-please + asset upload (provided).
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASSWORD` — optional; enable signed release APKs.
- App pipelines: `ITCH_API_KEY`, `GEMINI_API_KEY` (see `.env.example`) — authoring-time only,
  not needed for deploy.
