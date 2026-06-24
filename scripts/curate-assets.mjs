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

const manifestSrc = join(root, "scripts/assets.manifest.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestSrc, "utf8"));
} catch (err) {
  console.error(`Failed to read/parse ${manifestSrc}: ${err.message}`);
  process.exit(1);
}
const sourceRoot = process.env.LOCAL_ASSET_DIR || manifest.sourceRoot;
const outRoot = join(root, "public/assets");

// Per-section source roots. Curated PSX GLBs are produced by the local
// FBX->GLB pipeline (Blender) into a gitignored repo dir, so models source from
// there; audio still copies from the mounted asset library. A section root may
// be relative to the repo (resolved here) or absolute.
const sectionRoots = {
  models: manifest.modelsRoot ? resolve(root, manifest.modelsRoot) : sourceRoot,
  audio: manifest.audioRoot ? resolve(root, manifest.audioRoot) : sourceRoot,
};

// Resolve an entry's source root: a per-entry `root` (repo-relative) wins, else
// the section root. Lets a few converted/derived assets live in raw-assets/.
const rootFor = (entry) =>
  entry.root ? resolve(root, entry.root) : (sectionRoots[entry.section] ?? sourceRoot);

const usedRoots = [...new Set(Object.values(sectionRoots))];
for (const r of usedRoots) {
  if (!existsSync(r)) {
    console.error(`Asset source not found at ${r}. Set LOCAL_ASSET_DIR or mount the NAS.`);
    process.exit(1);
  }
}

const entries = [];
for (const section of ["models", "audio"]) {
  for (const domain of Object.keys(manifest[section] ?? {})) {
    for (const e of manifest[section][domain]) {
      entries.push({ section, ...e });
    }
  }
}

// Pass 1: validate every source exists BEFORE copying anything, so a missing
// asset never leaves a partial copy or a manifest that doesn't match disk.
const missing = entries.filter((e) => !existsSync(join(rootFor(e), e.from)));
if (missing.length > 0) {
  for (const e of missing) console.error(`MISSING source: ${e.from}`);
  console.error(`\n${missing.length} source asset(s) missing — aborting (nothing copied).`);
  process.exit(1);
}

// Pass 2: copy + record.
const records = [];
let copied = 0;
for (const e of entries) {
  const src = join(rootFor(e), e.from);
  const rel = `${e.section}/${e.to}`;
  const dest = join(outRoot, rel);
  const bytes = readFileSync(src);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!dry) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  records.push({ path: rel, bytes: bytes.length, sha256 });
  copied++;
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
