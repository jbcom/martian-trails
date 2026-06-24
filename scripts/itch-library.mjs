#!/usr/bin/env node
/**
 * Paginate the itch.io owned-keys library into .itch-cache/library.json and
 * print a classification summary, so the curation allow-list (in
 * fetch-itch-assets.mjs) can be built from real titles. Reads ITCH_API_KEY from
 * the env or .env (gitignored). The cache is gitignored too — only curated
 * keepers under public/assets/ ship.
 *
 * Usage: node scripts/itch-library.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, ".itch-cache");
const CACHE = join(CACHE_DIR, "library.json");

function readApiKey() {
  if (process.env.ITCH_API_KEY) return process.env.ITCH_API_KEY;
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return undefined;
  return readFileSync(envPath, "utf8").match(/ITCH_API_KEY=(\S+)/)?.[1];
}

const KEY = readApiKey();
if (!KEY) {
  console.error("ITCH_API_KEY missing — set the env var or add it to .env");
  process.exit(1);
}

const all = [];
for (let page = 1; page < 40; page++) {
  const res = await fetch(`https://itch.io/api/1/${KEY}/my-owned-keys?page=${page}`);
  const data = await res.json();
  const keys = Array.isArray(data.owned_keys) ? data.owned_keys : [];
  if (keys.length === 0) break;
  for (const k of keys) {
    all.push({
      keyId: k.id,
      gameId: k.game?.id,
      title: k.game?.title ?? "?",
      classification: k.game?.classification ?? "?",
      shortText: k.game?.short_text ?? "",
      url: k.game?.url ?? "",
    });
  }
}

mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(CACHE, JSON.stringify(all, null, 2));
console.log(`library: ${all.length} packs → ${CACHE}`);
