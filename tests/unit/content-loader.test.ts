import { describe, expect, it } from "vitest";
import { allEvents, eventsWithTags, getEvent } from "@/content/events";

describe("event content registry", () => {
  it("loads the generated events", () => {
    expect(allEvents().length).toBeGreaterThan(0);
  });

  it("looks up an event by id", () => {
    const first = allEvents()[0];
    expect(getEvent(first.id)).toBe(first);
    expect(getEvent("event:does-not-exist")).toBeUndefined();
  });

  it("filters events by tag", () => {
    const tagged = allEvents().find((e) => e.tags.length > 0);
    if (tagged) {
      expect(eventsWithTags(tagged.tags[0])).toContain(tagged);
    }
    expect(eventsWithTags("__no-such-tag__")).toHaveLength(0);
  });
});
