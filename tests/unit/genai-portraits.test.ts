import { describe, expect, it } from "vitest";
import type { GenerateImageFn } from "@/genai/client";
import { buildPortraitPrompt, CREW_FACETS, generatePortraits } from "@/genai/portraits";

describe("genai portraits — pure prompt + orchestration", () => {
  it("has a facet for each of the four founding crew", () => {
    expect(CREW_FACETS.map((f) => f.id).sort()).toEqual(["frank", "john", "maya", "nadia"]);
  });

  it("builds a prompt with the role, the helmet framing, and the locked style", () => {
    // The prompt deliberately leads with the ROLE (not the crew name) + a
    // helmet-on framing — naming a person tripped the image model's policy.
    const p = buildPortraitPrompt(CREW_FACETS[0]);
    expect(p).toContain("Commander");
    expect(p).toContain("helmet");
    expect(p).toContain("PS1-era");
  });

  it("generates one portrait per facet, skipping declined images", async () => {
    // Key off the role (the prompt no longer contains the crew name).
    const declineEngineer: GenerateImageFn = async (prompt) =>
      prompt.includes("Engineer") ? null : new Uint8Array([1, 2, 3]);
    const out = await generatePortraits(declineEngineer);
    expect(out).toHaveLength(CREW_FACETS.length - 1);
    expect(out.find((p) => p.id === "maya")).toBeUndefined();
  });
});
