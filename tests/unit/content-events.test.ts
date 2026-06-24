import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { eventsFileSchema } from "@/schemas/event";

// The committed generated events must always validate against the schema and be
// internally consistent (unique ids, real trade-offs). This guards regenerated
// content from drifting out of spec before the M5 event engine consumes it.
const eventsPath = resolve(process.cwd(), "src/content/events/generated.json");

describe("generated trail events — content integrity", () => {
  it("the generated events file exists", () => {
    expect(existsSync(eventsPath), "run `pnpm genai:events` to generate it").toBe(true);
  });

  const raw = JSON.parse(readFileSync(eventsPath, "utf8"));
  const parsed = eventsFileSchema.safeParse(raw);

  it("validates against the event schema", () => {
    expect(
      parsed.success,
      parsed.success ? "" : JSON.stringify(parsed.error?.issues, null, 2),
    ).toBe(true);
  });

  it("has unique event ids", () => {
    if (!parsed.success) return;
    const ids = parsed.data.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every event offers at least two options (a real choice)", () => {
    if (!parsed.success) return;
    for (const e of parsed.data) {
      expect(e.options.length, `${e.id} needs >=2 options`).toBeGreaterThanOrEqual(2);
    }
  });

  it("every option has at least one effect", () => {
    if (!parsed.success) return;
    for (const e of parsed.data) {
      for (const o of e.options) {
        expect(o.effects.length, `${e.id} option "${o.label}"`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
