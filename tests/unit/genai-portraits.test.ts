import { describe, expect, it } from "vitest";
import type { GenerateImageFn } from "@/genai/client";
import { buildPortraitPrompt, CREW_FACETS, generatePortraits } from "@/genai/portraits";

describe("genai portraits — pure prompt + orchestration", () => {
  it("has a facet for each of the four founding crew", () => {
    expect(CREW_FACETS.map((f) => f.id).sort()).toEqual(["frank", "john", "maya", "nadia"]);
  });

  it("builds a prompt that names the crew member, role, and the locked style", () => {
    const p = buildPortraitPrompt(CREW_FACETS[0]);
    expect(p).toContain("John");
    expect(p).toContain("Commander");
    expect(p).toContain("PS1-era");
  });

  it("generates one portrait per facet, skipping declined images", async () => {
    const onlyEven: GenerateImageFn = async (prompt) =>
      prompt.includes("Maya") ? null : new Uint8Array([1, 2, 3]);
    const out = await generatePortraits(onlyEven);
    expect(out).toHaveLength(CREW_FACETS.length - 1);
    expect(out.find((p) => p.id === "maya")).toBeUndefined();
  });
});
