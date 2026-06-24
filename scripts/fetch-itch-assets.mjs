#!/usr/bin/env node
/**
 * Download the curated allow-list of purchased itch.io packs into
 * raw-assets/archives/, then extract into raw-assets/extracted/<slug>/.
 * Idempotent — skips archives that already exist with matching size + md5.
 *
 * Art direction: 3D-PSX (NOT Kenney/pixel) — a side-3D view with PSX-era models
 * for a rich nostalgic feel (see docs/ART-DIRECTION.md). The allow-list pulls the
 * owned PSX/sci-fi packs applicable to a Mars survival game.
 *
 * Reads ITCH_API_KEY from the env or .env (gitignored) and the owned-keys cache
 * at .itch-cache/library.json (built by scripts/itch-library.mjs). raw-assets/
 * is gitignored: everything is hoarded locally, and only curated keepers are
 * promoted to public/assets/ (with a MANIFEST.json entry; the integrity gate in
 * tests/unit/asset-manifest.test.ts refuses unmanifested assets).
 *
 * Usage:
 *   node scripts/fetch-itch-assets.mjs        # download + extract
 *   node scripts/fetch-itch-assets.mjs --dry  # list what would be downloaded
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVES = join(ROOT, "raw-assets", "archives");
const EXTRACTED = join(ROOT, "raw-assets", "extracted");
const LIBRARY = join(ROOT, ".itch-cache", "library.json");

const DRY = process.argv.includes("--dry");

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

// Curation allow-list — exact titles from .itch-cache/library.json, mapped to
// the Martian Trail art direction (3D-PSX side view) and gameplay surfaces:
//   3D-PSX models → rover/crew/props/scenes (the nostalgic side-3D look)
//   SFX/music packs → the howler audio layer (engine/airlock/UI/stingers/ambient)
const ALLOW_LIST = new Set([
  // --- 3D-PSX models (the look) ---
  "PSX Astronaut", // EVA actor + crew
  "SciFi Character Pack", // colonist NPC variety
  "PSX Ghost Hunting Tools Pack", // EVA scanner/prospecting tools
  "PSX Bus", // pressurized-vehicle base for the rover kitbash
  "PSX-Machinery & Pipes", // habitat/outpost interior + props
  "PSX-Traps", // hazard props
  "Robot Voxel Character - 3D Lowpoly Game Asset", // utility droid
  "Robot 1 Voxel Character - 3D Lowpoly Model",
  "Robot 2 Voxel Character - 3D Lowpoly Model",
  "Space & Planetary Hexes", // map / planetary backdrops
  // --- audio (howler layer) ---
  "UI Sound Effects Pack – 40 Game Interface Sounds (WAV + MP3)",
  "Calm Menu Music Pack – Perfect for Game Menus & UI (10 Loops)",
  "Dark Ambient Game Music Pack – Mystery & Horror Loops",
  "Victory & Level Complete Music Pack – 24 Game Stingers",
  "Impact & Hit Sound Effects Pack",
  "Explosion Sound Effects Pack for Games",
  "Weapon & Laser Sound Effects Pack",
  "Cinematic Whoosh SFX Pack – 42 Fast Transition Sounds",
  "Ultimate Ambient Sound Effects Pack",
  "Retro PSX Footstep SFX Pack (40 Lo-Fi Foley Sounds)",
]);

const library = JSON.parse(readFileSync(LIBRARY, "utf8"));
const packs = library.filter((p) => ALLOW_LIST.has(p.title));
const missing = [...ALLOW_LIST].filter((t) => !packs.some((p) => p.title === t));
if (missing.length > 0) {
  console.error(`allow-list titles missing from library cache:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`Processing ${packs.length}/${library.length} allow-listed packs (dry=${DRY})`);

mkdirSync(ARCHIVES, { recursive: true });
mkdirSync(EXTRACTED, { recursive: true });

const ARCHIVE_RE = /\.(zip|rar|7z)$/i;
const LOOSE_RE = /\.(glb|gltf|fbx|obj|png|gif|webp|wav|mp3|ogg)$/i;
let downloaded = 0;
let skipped = 0;
let failed = 0;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

for (const pack of packs) {
  const uploadsResp = await apiGet(
    `/api/1/key/game/${pack.gameId}/uploads?download_key_id=${pack.keyId}`,
  );
  const all = uploadsResp?.uploads ?? [];
  const archives = all.filter((u) => ARCHIVE_RE.test(u.filename ?? ""));
  const uploads =
    archives.length > 0 ? archives : all.filter((u) => LOOSE_RE.test(u.filename ?? ""));

  if (uploads.length === 0) {
    console.warn(`  [${pack.title}] no usable uploads found`);
    failed++;
    continue;
  }

  for (const upload of uploads) {
    const looseDir = join(EXTRACTED, slugify(pack.title));
    const isArchive = ARCHIVE_RE.test(upload.filename);
    if (!isArchive && !DRY) mkdirSync(looseDir, { recursive: true });
    // basename() strips any path components the API could smuggle (zip-slip guard)
    const safeName = basename(upload.filename);
    const dest = isArchive ? join(ARCHIVES, safeName) : join(looseDir, safeName);

    if (existsSync(dest) && statSync(dest).size === upload.size) {
      const md5 = createHash("md5").update(readFileSync(dest)).digest("hex");
      if (md5 === upload.md5_hash) {
        skipped++;
        continue;
      }
    }

    if (DRY) {
      console.log(`  WOULD DOWNLOAD: ${upload.filename} (${upload.size} bytes) ← ${pack.title}`);
      downloaded++;
      continue;
    }

    const dlInfo = await apiGet(
      `/api/1/key/upload/${upload.id}/download?download_key_id=${pack.keyId}`,
    );
    if (!dlInfo?.url) {
      console.error(`  [${pack.title}] no signed URL in response`);
      failed++;
      continue;
    }
    // only follow https download URLs (refuse file://, ftp://, plain-http redirect)
    if (!dlInfo.url.startsWith("https://")) {
      console.error(`  [${pack.title}] refusing non-https download URL: ${dlInfo.url}`);
      failed++;
      continue;
    }

    // --proto/--proto-redir constrain BOTH the request and every redirect to https
    const result = spawnSync(
      "curl",
      ["-sS", "-fL", "--proto", "=https", "--proto-redir", "=https", "-o", dest, dlInfo.url],
      { stdio: "inherit" },
    );
    if (result.status !== 0 || statSync(dest).size !== upload.size) {
      console.error(`  [${pack.title}] download failed or size mismatch for ${upload.filename}`);
      failed++;
      continue;
    }
    console.log(`  ✓ ${upload.filename} (${upload.size} bytes) ← ${pack.title}`);
    downloaded++;
  }
}

if (!DRY) {
  console.log("\nExtracting…");
  for (const f of readdirSync(ARCHIVES)) {
    if (!ARCHIVE_RE.test(f)) continue;
    const slug = slugify(f.replace(ARCHIVE_RE, ""));
    const target = join(EXTRACTED, slug);
    if (existsSync(target) && statSync(target).mtimeMs >= statSync(join(ARCHIVES, f)).mtimeMs) {
      continue;
    }
    mkdirSync(target, { recursive: true });
    try {
      if (/\.zip$/i.test(f)) {
        execFileSync("unzip", ["-q", "-o", join(ARCHIVES, f), "-d", target], { stdio: "inherit" });
      } else {
        execFileSync("unar", ["-quiet", "-o", target, join(ARCHIVES, f)], { stdio: "inherit" });
      }
      console.log(`  ✓ extracted ${f} → ${slug}`);
    } catch {
      console.error(`  ✗ failed to extract ${f}`);
    }
  }
}

console.log(`\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`);

async function apiGet(path) {
  const result = spawnSync(
    "curl",
    ["-sS", "-fL", "-H", `Authorization: Bearer ${KEY}`, `https://itch.io${path}`],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(`  apiGet failed: ${path}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error(`  apiGet: non-JSON response for ${path}`);
    return null;
  }
}
