import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MUSIC, SFX } from "@/audio/library";

// Every symbolic audio id must point at a real curated asset under public/.
const publicRoot = resolve(process.cwd(), "public");

describe("audio library — symbolic ids resolve to curated assets", () => {
  const entries: [string, string][] = Object.entries({ ...SFX, ...MUSIC });

  it.each(entries)("%s -> %s exists", (_id, path) => {
    expect(existsSync(join(publicRoot, path)), `missing ${path}`).toBe(true);
  });
});
