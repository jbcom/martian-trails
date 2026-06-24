#!/usr/bin/env node
/**
 * Generate colonist "news/lore" lines for each outpost (the Oregon Trail "fort
 * news" analog) via Gemini → src/content/outposts/lore.json. Opt-in: needs
 * GEMINI_API_KEY (env or .env). Validated against the lore schema.
 *
 * Usage: pnpm genai:lore
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geminiGenerate, parseGeneratedArray, readGeminiKey } from "../src/genai/client.ts";
import { loreFileSchema } from "../src/schemas/lore.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "content", "outposts");
const OUT = join(OUT_DIR, "lore.json");

const OUTPOSTS = ["Tharsis Outpost", "Pavonis Mons Base", "Noctis Labyrinthus"];

const SYSTEM = `You write ambient colonist "news" overheard at Mars colonization outposts in "Martian Trail" (a hard-sci-fi Oregon-Trail-style survival game). Output a STRICT JSON array, one object per outpost:
- "outpost": exact name given
- "lines": 4-6 short overheard lines (each <= 160 chars) — colonists trading news, rumors, warnings about the route ahead, terraforming progress, supply shortages, other expeditions. Grounded hard-sci-fi Mars, no fantasy, no real people. Atmospheric and useful (some hint at upcoming hazards).
Output ONLY the JSON array.`;

const envText = existsSync(join(ROOT, ".env"))
  ? readFileSync(join(ROOT, ".env"), "utf8")
  : undefined;
const key = readGeminiKey(envText);
if (!key) {
  console.error("GEMINI_API_KEY missing — set the env var or add it to .env");
  process.exit(1);
}

const prompt = `Write overheard colonist news for these outposts, in route order: ${OUTPOSTS.join(", ")}.`;
const raw = parseGeneratedArray(await geminiGenerate(key)(SYSTEM, prompt));
const parsed = loreFileSchema.safeParse(raw);
if (!parsed.success) {
  console.error("Generated lore failed validation:");
  console.error(JSON.stringify(parsed.error.issues, null, 2).slice(0, 800));
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, `${JSON.stringify(parsed.data, null, 2)}\n`);
console.log(`Wrote lore for ${parsed.data.length} outposts → ${OUT}`);
