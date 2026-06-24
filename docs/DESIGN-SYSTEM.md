---
title: Design System
updated: 2026-06-23
status: current
domain: creative
---

# Martian Trail — Design System

The **UI / HUD / 2D layer** language (the diegetic Mars-ops interface over the 3D scene).
The 3D scene art is `docs/ART-DIRECTION.md`; this is the React/DOM + token layer.

## Visual language: "UNOMA Field Ops"
A diegetic, glassmorphic Mars-operations interface — as if reading the rover's own life-support
console through a dusty pressurized canopy. Dark iron-oxide ground, warm rust/ochre accents,
holographic glass panels, monospaced telemetry, restrained motion. Modern and legible (2026),
never retro-CRT. The HUD sits *over* the R3F ortho scene; it never letterboxes it.

## Palette (the seed brand identity)
| Token | Hex | Use |
|-------|-----|-----|
| `--color-mars-bg` | `#1a0b08` | Page/scene base (deep iron oxide) |
| `--color-mars-red` | `#8a3324` | Regolith, primary structural accent |
| `--color-mars-dust` | `#cc7052` | Brand text, highlights, rover dust |
| `--color-mars-sand` | `#e89b71` | Body text on dark, light accents |
| `--color-ui-glass` | `rgba(20,8,6,0.85)` | Glass-panel fill |
| `--color-ui-border` | `rgba(204,112,82,0.35)` | Glass-panel edge |
| `--color-alert` | `#ff5a3c` | Critical vitals / alarm state |
| `--color-ok` | `#44ffaa` | Nominal / safe state |

These live in `src/styles/tokens.css` (`@theme`), mirrored in `src/styles/tokens.ts`, kept in
sync by `tokens.test.ts` (m2-3). Brand-hex drift is gated by `.claude/gates.json`.

## Typography
- **Display** (`--font-display`): a condensed techy sans (Rajdhani / Orbitron class) —
  headers, telemetry labels, the MARTIAN TRAIL wordmark. Uppercase, wide tracking.
- **Body** (`--font-body`): a clean humanist/grotesque sans (Inter class) — descriptions, log.
- **Telemetry** (`--font-mono`): a monospace for numeric vitals/readouts (alignment matters).
- Self-hosted via `@fontsource` (no Google CDN — offline/Capacitor safe). Wired in
  `src/styles/fonts.css` (m2-2).

## Glass panel
`background: linear-gradient(135deg, var(--color-ui-glass) 0%, rgba(10,4,3,0.95) 100%)`,
`backdrop-filter: blur(10px)`, `1px` `--color-ui-border`, `border-radius: var(--radius-panel)`,
`box-shadow: 0 8px 32px rgba(0,0,0,0.8), inset 0 0 15px rgba(204,112,82,0.1)`. Touch targets
≥ 44px. Panels respect `env(safe-area-inset-*)`.

## States
- **Nominal** — `--color-ok` accents, calm.
- **Warning** — `--color-mars-dust` pulse on the affected gauge.
- **Critical** — `--color-alert` bar + a full-screen vignette alarm overlay + klaxon (the POC's
  alarm, restored properly). Pulse animation `1s` ease alternate.

## Motion (framer-motion)
- Screen transitions: short cross-fade / slide (≤ 250ms), reduced-motion aware.
- Diegetic airlock open/close between depot↔travel (the rover physically departs) — the POC's
  signature beat, rebuilt in R3F + framer-motion.
- HUD feedback: gauge tweens, subtle number roll on resource change. No gratuitous bounce.

## Reference frames (named, for screenshot comparison)
The visual targets to compare playtest screenshots against (per STANDARDS visual-verification):
1. **Boot/depot** — MARTIAN TRAIL wordmark + UNDERHILL DEPOT glass panel over the garage scene.
2. **Travel HUD** — top progress mini-map + 3 glass vitals panels + bottom log console, over the
   side-view trail.
3. **Hazard Traverse** — the decision modal over the dramatic terrain feature.
4. **Critical alarm** — red vignette + alarm overlay.
Maintain reference captures in `docs/reference/` as scenes land.

## Responsive (phone / tablet / unfolded foldable)
Token-driven breakpoints; HUD reflows — phone: stacked/drawer panels; tablet: side HUD;
foldable (wide): side rails + wide scene. Touch-primary; safe-area insets everywhere. Full
spec in `docs/ARCHITECTURE.md` §responsive.
