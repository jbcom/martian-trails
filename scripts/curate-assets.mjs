#!/usr/bin/env node
/**
 * Curate game assets from the local library into public/assets/, organized by
 * logical domain (models/<rover|crew|terrain|rocks|outpost|props>, audio/<sfx|music>).
 * Driven by scripts/assets.manifest.json — "code interprets content, never embeds it".
 *
 * Writes public/assets/MANIFEST.json (path + bytes + sha256) which the integrity
 * test (tests/unit/asset-manifest.test.ts) asserts against, so no unmanifested or
 * missing asset slips into the bundle.
 *
 * Usage: node scripts/curate-assets.mjs [--dry]
 * Env:   LOCAL_ASSET_DIR overrides the manifest sourceRoot.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");

const manifest = JSON.parse(readFileSync(join(root, "scripts/assets.manifest.json"), "utf8"));
const sourceRoot = process.env.LOCAL_ASSET_DIR || manifest.sourceRoot;
const outRoot = join(root, "public/assets");

if (!existsSync(sourceRoot)) {
  console.error(
    `Asset library not mounted at ${sourceRoot}. Set LOCAL_ASSET_DIR or mount the NAS.`,
  );
  process.exit(1);
}

const entries = [];
for (const section of ["models", "audio"]) {
  for (const domain of Object.keys(manifest[section] ?? {})) {
    for (const e of manifest[section][domain]) {
      entries.push({ section, ...e });
    }
  }
}

const records = [];
let copied = 0;
let missing = 0;
for (const e of entries) {
  const src = join(sourceRoot, e.from);
  const rel = `${e.section}/${e.to}`;
  const dest = join(outRoot, rel);
  if (!existsSync(src)) {
    console.error(`MISSING source: ${e.from}`);
    missing++;
    continue;
  }
  const bytes = readFileSync(src);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!dry) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  records.push({ path: rel, bytes: bytes.length, sha256 });
  copied++;
}

if (missing > 0) {
  console.error(`\n${missing} source asset(s) missing — aborting.`);
  process.exit(1);
}

records.sort((a, b) => a.path.localeCompare(b.path));
const out = {
  generatedFrom: "scripts/assets.manifest.json",
  license: manifest.license,
  count: records.length,
  assets: records,
};
if (!dry) {
  mkdirSync(outRoot, { recursive: true });
  writeFileSync(join(outRoot, "MANIFEST.json"), `${JSON.stringify(out, null, 2)}\n`);
}

console.log(
  `${dry ? "[dry] " : ""}curated ${copied} assets into public/assets/ ` +
    `(${records.length} manifested).`,
);
