---
title: Art Direction
updated: 2026-06-23
status: current
domain: creative
---

# Martian Trail — Art Direction

Replaces the POC's procedural `PIXI.Graphics` with real, cohesive, production art.

## Decision: 3DLowPoly Kenney "Space" family, orthographic side view

A "side-scroller" does **not** mean 2D. The chosen direction is **3D GLB models rendered
through an orthographic side camera** — one continuous Kenney CC0 aesthetic across every
scene. Rationale:

1. **Cohesion** (the priority): `Space Kit` + `Space Station Kit` + `Ultimate Space Kit` +
   `Sci-Fi Essentials Kit` are a single Kenney visual language (palette, poly density,
   shading). Every signature scene is covered by *one* source — astronaut, rover, cliffs,
   dome/airlock, full modular interior, props, planets. All CC0.
2. **The 3D-in-side-view payoff:** ortho GLBs give parallax, reactive lighting, and the
   *rover-noses-down-the-ramp* animated hazard consequence the Hazard Traverse demands
   (`terrain_ramp` + `Rover_2`) — flat 2D sprite packs cannot.
3. **3DPSX is not viable locally for Mars** (the local 3DPSX library is fantasy/farm/PSX-horror;
   zero astronaut/rover/base/Mars terrain). A PSX look would require assembling 8+ separate
   owned itch packs — mixed conventions, the opposite of cohesion. Kept as a documented
   *alternate* only if a grittier tone is later wanted.

## Scene → asset map (local roots, all verified)
Root: `/Volumes/home/assets/3DLowPoly/Environment/Space/`

| Scene (Oregon Trail ancestor) | Primary assets |
|---|---|
| **EVA Prospecting** (hunting) | `Space Kit/astronautA.glb`; rocks/ice `Space Kit/rock*.glb`, `rock_crystalsLarge*.glb`, `crater*.glb`, `meteor.glb`; scanner-feel `machine_generator/wireless.glb`, `satelliteDish.glb`; sample yields `Ultimate Space Kit/Items/Pickup_*` |
| **Hazard Traverse** (river crossing) | `Space Kit/terrain_sideCliff.glb` (crevasse/scarp), `terrain_ramp*.glb` (the ford), `terrain_side*.glb`; rover `Ultimate Space Kit/Vehicles/Rover_2.glb`; span/winch `platform_*`, `supports_*`, `monorail_track*` |
| **Outpost / Depot** (forts + store) | exterior `hangar_round*Glass.glb` (airlock dome), `GeodesicDome.glb`, `Base_Large.glb`, `House_*`, `SolarPanel_*`; interior **`Space Station Kit`** (177 GLBs: walls/floors/doors/computers/tables/containers); colonists `astronautA/B` |
| **Rover** (wagon) | hero `Ultimate Space Kit/Vehicles/Rover_2.glb` (multi-wheel); haulers `craft_cargo*`, `craft_miner.glb` |
| **Trail backdrop** | `terrain*` tiles, `crater*`, `Planet_1..11.glb` (Phobos + horizon worlds) |

## Audio (local, CC0 — no core-loop gaps)
Root: `/Volumes/home/assets/Audio/`
- **SFX** `Sci-Fi Sounds/Audio/`: `doorOpen/Close`, `forceField` (airlock), `computerNoise`,
  `engineCircular`/`spaceEngine*` (rover loops), `thrusterFire`, `impactMetal`,
  `lowFrequency_explosion` (hazard stings).
- **Music** `Music/`: `Space Horror InGame Music (Exploration/Tense).wav` (trail/tension),
  `Music Loops/Loops/{Space Cadet,Mission Plausible}.ogg`.
- **UI** `Interface Sounds/`, `UI Audio/`. **Foley** for EVA regolith footsteps.

## Gaps → fill with the GenAI pipeline / meshy
1. Handheld drill / GPR scanner prop → `meshy_text_to_3d` (or Gemini imagen for a 2D HUD tool).
2. Ice-sheet mesh + dust-storm volume → render as engine particle/shader VFX overlays (no mesh).
3. Mars mountain/volcano silhouettes (Tharsis/Olympus), Mars sky gradients, Phobos disc →
   Gemini imagen parallax backdrops. (2DPhotorealistic HDRI/TERRAIN dirs are near-empty Blender
   PBR sets — not game-ready.)

## Open engine implication
3D GLB ortho rendering points the render layer at **Three.js (ortho camera)** rather than
PixiJS — see the engine decision recorded in `docs/ARCHITECTURE.md` / the directive. Audio,
content, sim, and the screen-router are renderer-agnostic and unaffected.

## Itch alternate (owned, not assembled)
If a grittier PSX tone is later chosen: `PSX Astronaut`, `PSX-RV-Camper/Vans`, `PSX Bus`,
`PSX Character Megapack`, `SciFi Character Pack`, `PSX-Machinery & Pipes`,
`Retro PSX Footstep SFX Pack`, `Space & Planetary Hexes`.
