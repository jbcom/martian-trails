import generated from "@/content/events/generated.json";
import { eventsFileSchema, type TrailEvent } from "@/schemas/event";

/**
 * Trail-event content registry. Loads the GenAI-generated events (validated at
 * module load) and exposes lookup/selection the M5 event engine interprets.
 * "Code interprets content, never embeds it" — the events themselves are data.
 */
const events: TrailEvent[] = eventsFileSchema.parse(generated);

const byId = new Map(events.map((e) => [e.id, e]));

/** All trail events. */
export function allEvents(): readonly TrailEvent[] {
  return events;
}

/** Look up an event by id, or undefined. */
export function getEvent(id: string): TrailEvent | undefined {
  return byId.get(id);
}

/** Events carrying every one of the given tags. */
export function eventsWithTags(...tags: string[]): TrailEvent[] {
  return events.filter((e) => tags.every((t) => e.tags.includes(t)));
}
