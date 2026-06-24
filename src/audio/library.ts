/**
 * Symbolic audio library — id → asset path. Keep this file boring: no logic, no
 * derivation. Adding a sound = add a line here. Paths are relative to BASE_URL
 * and resolve into the curated public/assets/audio/ tree (see scripts/assets.manifest.json).
 */
export const SFX = {
  airlockOpen: "assets/audio/sfx/airlock_open.ogg",
  airlockClose: "assets/audio/sfx/airlock_close.ogg",
  forcefield: "assets/audio/sfx/forcefield.ogg",
  computer: "assets/audio/sfx/computer.ogg",
  engineLoop: "assets/audio/sfx/engine_loop.ogg",
  thruster: "assets/audio/sfx/thruster.ogg",
  impactMetal: "assets/audio/sfx/impact_metal.ogg",
  hazardSting: "assets/audio/sfx/hazard_sting.ogg",
} as const;

export const MUSIC = {
  menu: "assets/audio/music/menu.ogg",
  trail: "assets/audio/music/trail.ogg",
  tension: "assets/audio/music/tension.mp3",
  ambient: "assets/audio/music/ambient.mp3",
  victory: "assets/audio/music/victory.mp3",
} as const;

export type SfxId = keyof typeof SFX;
export type MusicId = keyof typeof MUSIC;
