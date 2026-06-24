import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const assetsRoot = resolve(process.cwd(), "public/assets");
const manifestPath = join(assetsRoot, "MANIFEST.json");

type Record = { path: string; bytes: number; sha256: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe("public/assets integrity", () => {
  it("has a MANIFEST.json", () => {
    expect(existsSync(manifestPath)).toBe(true);
  });

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    assets: Record[];
  };
  const manifested = new Set(manifest.assets.map((a) => a.path));

  it("every manifested asset exists with the recorded size + hash", () => {
    for (const a of manifest.assets) {
      const full = join(assetsRoot, a.path);
      expect(existsSync(full), `missing ${a.path}`).toBe(true);
      const bytes = readFileSync(full);
      expect(bytes.length, `size drift ${a.path}`).toBe(a.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), `hash drift ${a.path}`).toBe(
        a.sha256,
      );
    }
  });

  it("no unmanifested files under public/assets (except MANIFEST.json)", () => {
    const onDisk = walk(assetsRoot)
      .map((f) => relative(assetsRoot, f).split(/[/\\]/).join("/"))
      .filter((p) => p !== "MANIFEST.json");
    const stray = onDisk.filter((p) => !manifested.has(p));
    expect(stray, `unmanifested assets: ${stray.join(", ")}`).toEqual([]);
  });
});
