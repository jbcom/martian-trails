#!/usr/bin/env node
/**
 * Generate Martian Trail trail-events via Gemini and write them to
 * src/content/events/generated.json (validated against the event schema). Ported
 * from the maga-money-moves dev pipeline. Opt-in: needs GEMINI_API_KEY (env or
 * .env, gitignored) — never silently mocks.
 *
 * Usage:
 *   GEMINI_API_KEY=... pnpm genai:events            # default 12 events
 *   pnpm genai:events -- --count 20 --themes radiation,dust,mechanical
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geminiGenerate, readGeminiKey } from "../src/genai/client.ts";
import { generateEvents } from "../src/genai/events.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "content", "events");
const OUT = join(OUT_DIR, "generated.json");

const args = process.argv.slice(2);
const countArg = args[args.indexOf("--count") + 1];
const themesArg = args[args.indexOf("--themes") + 1];
const count = args.includes("--count") ? Number(countArg) : 12;
const themes = args.includes("--themes") ? (themesArg?.split(",") ?? []) : [];

const envText = existsSync(join(ROOT, ".env"))
  ? readFileSync(join(ROOT, ".env"), "utf8")
  : undefined;
const key = readGeminiKey(envText);
if (!key) {
  console.error("GEMINI_API_KEY missing — set the env var or add it to .env");
  process.exit(1);
}

console.log(`Generating ${count} events${themes.length ? ` (themes: ${themes.join(", ")})` : ""}…`);
const { events, rejected } = await generateEvents(geminiGenerate(key), count, themes);

if (rejected.length > 0) {
  console.warn(`Rejected ${rejected.length} malformed item(s):`);
  for (const r of rejected) console.warn(`  ${r.error.split("\n")[0]}`);
}
if (events.length === 0) {
  console.error("No valid events generated — aborting (nothing written).");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, `${JSON.stringify(events, null, 2)}\n`);
console.log(`Wrote ${events.length} validated events → ${OUT}`);
