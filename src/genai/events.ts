import { type GenerateFn, parseGeneratedArray } from "@/genai/client";
import { eventSchema, type TrailEvent } from "@/schemas/event";

/**
 * Mars trail-event generation — pure prompt + validation around an injected
 * GenerateFn (so the orchestrator is testable with a stub; only the real run
 * needs a key + network).
 */

export const EVENT_SYSTEM_INSTRUCTION = `You are the event designer for "Martian Trail", an Oregon-Trail-style survival game set on a hard-science-fiction Mars. A crew of four colonists drives a pressurized rover 2500 km from Underhill Depot to Korolev Crater, rationing oxygen (kg), water (L), rations (kg), power, morale, hull, parts, and medkits.

Generate trail events as a STRICT JSON array. Each event:
- "id": "event:<kebab-case>"
- "title": <= 48 chars, evocative (e.g. "Solar Flare Outburst")
- "description": <= 280 chars, grounded hard-sci-fi Mars flavor — no fantasy, no real people
- "tags": array of lowercase tags (e.g. ["weather","radiation"])
- "options": 2-4 player choices. Each: "label" (<=48 chars), "effects" (>=1, each {"target","delta"} where target is one of oxygen|water|rations|power|morale|hull|parts|medkits and delta is a signed number in absolute units), optional "log" (<=160 chars).

Rules: every event presents a real trade-off (no strictly-best option). Keep deltas plausible (oxygen/water/rations in tens, power/morale/hull in single-to-tens, parts/medkits 1-2). Output ONLY the JSON array, no prose, no markdown fences.`;

export function buildEventPrompt(count: number, themes: string[]): string {
  const themeLine = themes.length ? ` Lean into these situations: ${themes.join(", ")}.` : "";
  return `Generate ${count} distinct Martian Trail events.${themeLine}`;
}

export interface GenerateEventsResult {
  events: TrailEvent[];
  rejected: { raw: unknown; error: string }[];
}

/** Generate + validate events. Invalid items are collected, not thrown. */
export async function generateEvents(
  generate: GenerateFn,
  count: number,
  themes: string[] = [],
): Promise<GenerateEventsResult> {
  const raw = parseGeneratedArray(
    await generate(EVENT_SYSTEM_INSTRUCTION, buildEventPrompt(count, themes)),
  );
  const events: TrailEvent[] = [];
  const rejected: { raw: unknown; error: string }[] = [];
  for (const item of raw) {
    const parsed = eventSchema.safeParse(item);
    if (parsed.success) events.push(parsed.data);
    else rejected.push({ raw: item, error: parsed.error.message });
  }
  return { events, rejected };
}
