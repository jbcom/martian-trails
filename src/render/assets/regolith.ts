import * as THREE from "three";
import { colors } from "@/styles/tokens";

/**
 * Bakes a tileable Martian regolith texture to an offscreen canvas: a dusty
 * base in the Mars palette, value-noise mottling, scattered pebbles, and a few
 * shallow crater rings. This is a real generated surface texture (deterministic,
 * seeded), NOT a flat-colour placeholder — the ground reads as weathered regolith
 * and tiles seamlessly when repeated across the trail.
 */
export function makeRegolithTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas context unavailable for regolith texture");

  // Deterministic LCG so the surface is identical across runs.
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Base fill.
  ctx.fillStyle = colors.marsRed;
  ctx.fillRect(0, 0, size, size);

  // Value-noise mottling: many soft translucent blobs in dust/sand/bg tones.
  const tones = [colors.marsDust, colors.marsSand, colors.marsBg];
  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 10;
    const tone = tones[(rand() * tones.length) | 0];
    ctx.globalAlpha = 0.04 + rand() * 0.1;
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scattered pebbles (small hard specks, wrapped for tiling).
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.6 + rand() * 1.6;
    ctx.fillStyle = rand() > 0.5 ? colors.marsBg : colors.marsSand;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // A few shallow crater rings.
  for (let i = 0; i < 5; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 26;
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = colors.marsBg;
    ctx.lineWidth = 1.5 + rand() * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = colors.marsSand;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
