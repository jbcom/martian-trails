#!/usr/bin/env node
/**
 * Generate Martian-NPC encounter portraits (M8) via Imagen, written to
 * public/assets/generated/portraits/<portrait-key>.png — the same directory + locked PSX style
 * as the crew portraits, so traveler faces cohere with the founding four (docs/ENCOUNTERS.md §4).
 *
 * Reuses buildPortraitPrompt by mapping each NPC's archetype→role and look→look. Opt-in: needs
 * GEMINI_API_KEY (env or .env, gitignored). Filesystem-cached; skips existing PNGs unless --force.
 *
 * Usage:  GEMINI_API_KEY=... pnpm genai:npc-portraits [-- --force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geminiGenerateImage, readGeminiKey } from "../src/genai/client.ts";
import { buildPortraitPrompt } from "../src/genai/portraits.ts";
import { martianNpcsFileSchema } from "../src/schemas/encounter.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "assets", "generated", "portraits");
const force = process.argv.includes("--force");

const envText = existsSync(join(ROOT, ".env"))
  ? readFileSync(join(ROOT, ".env"), "utf8")
  : undefined;
const key = readGeminiKey(envText);
if (!key) {
  console.error("GEMINI_API_KEY missing — set the env var or add it to .env");
  process.exit(1);
}

const npcs = martianNpcsFileSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "src", "content", "encounters", "npcs.json"), "utf8")),
);

const generateImage = geminiGenerateImage(key);
mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
let skipped = 0;
let declined = 0;
for (const npc of npcs) {
  const portraitKey = npc.portrait ?? npc.id.replace(/^npc:/, "");
  const dest = join(OUT_DIR, `${portraitKey}.png`);
  if (existsSync(dest) && !force) {
    skipped++;
    continue;
  }
  // Map the NPC onto the crew-portrait facet shape (archetype reads as the role).
  const prompt = buildPortraitPrompt({
    id: portraitKey,
    name: npc.name,
    role: npc.archetype,
    look: npc.look,
  });
  try {
    const png = await generateImage(prompt);
    if (!png) {
      console.warn(`declined: ${npc.id} (image policy)`);
      declined++;
      continue;
    }
    writeFileSync(dest, png);
    console.log(`wrote ${portraitKey}.png  (${npc.name}, ${npc.archetype})`);
    written++;
  } catch (err) {
    console.warn(`failed: ${npc.id} —`, err instanceof Error ? err.message : err);
    declined++;
  }
}

console.log(`\nNPC portraits: ${written} written, ${skipped} cached, ${declined} declined/failed.`);
