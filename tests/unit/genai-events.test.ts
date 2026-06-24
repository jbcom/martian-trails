import { describe, expect, it } from "vitest";
import type { GenerateFn } from "@/genai/client";
import { buildEventPrompt, generateEvents } from "@/genai/events";

const validEvent = {
  id: "event:solar-flare",
  title: "Solar Flare Outburst",
  description: "A coronal burst floods the route with hard radiation.",
  tags: ["weather", "radiation"],
  options: [
    { label: "Shelter in place (lose a Sol)", effects: [{ target: "morale", delta: -5 }] },
    { label: "Push through", effects: [{ target: "hull", delta: -8 }] },
  ],
};

const stub =
  (payload: unknown): GenerateFn =>
  async () =>
    JSON.stringify(payload);

describe("genai events — pure prompt + validation", () => {
  it("builds a prompt that includes the count and themes", () => {
    const p = buildEventPrompt(5, ["dust", "radiation"]);
    expect(p).toContain("5");
    expect(p).toContain("dust");
    expect(p).toContain("radiation");
  });

  it("accepts valid events and rejects malformed ones", async () => {
    const bad = { id: "nope", title: "", options: [] };
    const { events, rejected } = await generateEvents(stub([validEvent, bad]), 2);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("event:solar-flare");
    expect(rejected).toHaveLength(1);
  });

  it("tolerates markdown fences / prose around the JSON array", async () => {
    const noisy: GenerateFn = async () =>
      `Here you go:\n\`\`\`json\n[${JSON.stringify(validEvent)}]\n\`\`\``;
    const { events } = await generateEvents(noisy, 1);
    expect(events).toHaveLength(1);
  });

  it("returns no events when the model returns nothing parseable", async () => {
    const empty: GenerateFn = async () => "I cannot help with that.";
    const { events } = await generateEvents(empty, 3);
    expect(events).toHaveLength(0);
  });
});
