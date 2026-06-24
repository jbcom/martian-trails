---
title: Art Direction
updated: 2026-06-24
status: current
domain: creative
---

# Martian Trail — Art Direction

Replaces the POC's procedural `PIXI.Graphics` with real, production art. **ZERO procedural
or placeholder geometry ships** — no flat-colored boxes/planes as stand-ins (user mandate,
2026-06-23). Every scene uses a real curated asset.

## Decision: 3D-PSX, side-3D view (REVERSED from Kenney — 2026-06-23)

A "side-scroller" does **not** mean 2D, and it does not mean clean low-poly. The chosen
direction is **PSX-era 3D models rendered through a side-3D (orthographic/near-ortho) camera**
— a rich, nostalgic PS1-era look (low-res textures, vertex jitter feel, chunky geometry) that
reads as retro while giving real 3D parallax, lighting, and the *rover-noses-down-the-ramp*
animated hazard. The user's call: this is "MUCH better while still feeling nostalgic" than the
clean Kenney low-poly. **Kenney/pixel-era is OUT.**

This is now viable because the **owned itch PSX library** (pulled via `pnpm assets:fetch` —
`scripts/fetch-itch-assets.mjs`) supplies the Mars-relevant PSX packs the local 3DPSX folder
lacked:
- **PSX Astronaut** (ships a ready GLB) — EVA actor + crew.
- **PSX Bus** → kitbashed pressurized rover; **PSX-Electrical** (machinery + pipes) → habitat /
  outpost interior + props; **PSX Ghost Hunting Tools** → EVA scanner/prospecting tools;
  **PSX Traps** → hazard props; **Robot voxel** characters → utility droids;
  **Space & Planetary Hexes** → planetary backdrops / map.
- Audio: UI SFX, victory/level stingers, dark-ambient beds, impacts, lasers, whoosh, PSX
  footsteps — all owned, into the howler layer.

### Format pipeline
Most PSX packs ship `.fbx` (some `.gltf`); the web needs `.glb`. The curation step converts
FBX→GLB headless via Blender (`/opt/homebrew/bin/blender`), then promotes keepers to
`public/assets/models/` with manifest + integrity gate. PSX Astronaut's bundled GLB is used
directly. Source packs live in gitignored `raw-assets/`; only curated GLBs ship.

## Scene → asset map (local roots, all verified)
Primary roots: `/Volumes/home/assets/3DPSX/PSX Mega Pack II v1.8/`,
`/Volumes/home/assets/3DLowPoly/Environment/Space/`, and curated owned itch PSX packs in
`raw-assets/`.

| Scene (Oregon Trail ancestor) | Primary assets |
|---|---|
| **EVA Prospecting** (hunting) | `Space Kit/astronautA.glb`; rocks/ice `Space Kit/rock*.glb`, `rock_crystalsLarge*.glb`, `crater*.glb`, `meteor.glb`; scanner-feel `machine_generator/wireless.glb`, `satelliteDish.glb`; sample yields `Ultimate Space Kit/Items/Pickup_*` |
| **Hazard Traverse** (river crossing) | `Space Kit/terrain_sideCliff.glb` (crevasse/scarp), `terrain_ramp*.glb` (the ford), `terrain_side*.glb`; rover `Ultimate Space Kit/Vehicles/Rover_2.glb`; span/winch `platform_*`, `supports_*`, `monorail_track*` |
| **Outpost / Depot / Terminus interiors** (forts + store + finale) | 3DPSX modular base kit from `PSX Mega Pack II v1.8`: `floor_ceiling_hr_*`, `wall_hr_*`, `garage_door_frame_hr_1`, `roof_hr_3_*`, `doorway_hr_1_wide`, `lamp_mx_1_a_on`, `electrical_equipment_*`, `test_machine_mx_1`, tanks, shelves, barrels, crates. Implemented as `BaseInteriorScene` variants (`underhill`, `outpost`, `korolev`) with slotted rover/NPC/terminal/cargo components, enclosed floors/walls/roofs, and no visible void leaks. Colonists use the curated PSX astronaut GLB. |
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
