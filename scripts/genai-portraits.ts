#!/usr/bin/env node
/**
 * Generate the four crew portraits via Imagen and write PNGs to
 * public/assets/generated/portraits/<id>.png. Ported from the maga-money-moves
 * portrait pipeline. Opt-in: needs GEMINI_API_KEY (env or .env, gitignored).
 * Filesystem-cached: skips a portrait whose PNG already exists unless --force.
 *
 * Usage:
 *   GEMINI_API_KEY=... pnpm genai:portraits [-- --force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geminiGenerateImage, readGeminiKey } from "../src/genai/client.ts";
import { buildPortraitPrompt, CREW_FACETS } from "../src/genai/portraits.ts";

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

const generateImage = geminiGenerateImage(key);
mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
let skipped = 0;
for (const facet of CREW_FACETS) {
  const dest = join(OUT_DIR, `${facet.id}.png`);
  if (existsSync(dest) && !force) {
    skipped++;
    continue;
  }
  console.log(`Generating portrait: ${facet.name} (${facet.role})…`);
  const bytes = await generateImage(buildPortraitPrompt(facet));
  if (!bytes) {
    console.warn(`  model produced no image for ${facet.id}`);
    continue;
  }
  writeFileSync(dest, bytes);
  console.log(`  ✓ ${dest}`);
  written++;
}

console.log(`\nDone. written=${written} skipped=${skipped}`);
