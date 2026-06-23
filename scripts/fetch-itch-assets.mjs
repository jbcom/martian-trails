import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const LOCAL_ASSET_DIR = process.env.LOCAL_ASSET_DIR || "/Volumes/home/assets";
const DEST_DIR = path.resolve("src/assets/fetched");

// Ensure destination directories exist
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

async function fetchItchAssets() {
  console.log("--- Initializing Martian Trail Asset Fetcher ---");

  const itchKey = process.env.ITCH_API_KEY;
  const itchUrl = process.env.ITCH_GAME_URL;

  if (itchKey && itchUrl) {
    console.log(`Configured to download from itch.io target: ${itchUrl}`);
    // Here we would implement itch butler API or web downloading
    // Utilizing cache inside .itch-cache/
  } else {
    console.log("No itch.io credentials found. Falling back to local directories.");
  }

  // Handle local fallback to Volumes/home/assets (2DLowPoly, 2DPhotoRealistic, and audio)
  if (fs.existsSync(LOCAL_ASSET_DIR)) {
    console.log(`Sourcing raw assets from local mount: ${LOCAL_ASSET_DIR}`);

    const assetCategories = ["2DLowPoly", "2DPhotoRealistic", "audio"];
    for (const category of assetCategories) {
      const srcPath = path.join(LOCAL_ASSET_DIR, category);
      const destPath = path.join(DEST_DIR, category);

      if (fs.existsSync(srcPath)) {
        console.log(`Found asset category: ${category}. Copying index...`);
        copyFolderSync(srcPath, destPath);
      } else {
        console.log(`Local category folder not found: ${srcPath}. Skipping.`);
      }
    }
  } else {
    console.warn(`Local asset volume not mounted at: ${LOCAL_ASSET_DIR}`);
    console.log("Sourcing procedural and fallback placeholders instead.");
    setupPlaceholders();
  }
}

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  for (const element of fs.readdirSync(from)) {
    const srcEl = path.join(from, element);
    const destEl = path.join(to, element);

    if (fs.lstatSync(srcEl).isDirectory()) {
      copyFolderSync(srcEl, destEl);
    } else {
      // Limit copying of huge assets to keep checkout lean, or copy everything
      fs.copyFileSync(srcEl, destEl);
    }
  }
}

function setupPlaceholders() {
  // Setup minor layout placeholder text/configs so Vite loads cleanly without missing files
  const placeholderText = "Procedural Asset Placeholder - No file copied";
  fs.writeFileSync(
    path.join(DEST_DIR, "assets-manifest.json"),
    JSON.stringify({ placeholder: true, text: placeholderText }, null, 2),
  );
  console.log("Placeholder manifest created at src/assets/fetched/assets-manifest.json");
}

fetchItchAssets().catch((err) => {
  console.error("Asset fetching failed:", err);
  process.exit(1);
});
