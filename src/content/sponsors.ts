import sponsorsData from "@/config/sponsors.json";
import { type Sponsor, sponsorsFileSchema } from "@/schemas/sponsor";

/**
 * Sponsor registry — the difficulty/profession choice. Loaded + validated at
 * module load; the sponsor-select screen interprets it, and the chosen sponsor's
 * budget seeds the depot store while its scoreMultiplier scales the terminus score.
 */
const { roster } = sponsorsFileSchema.parse(sponsorsData);

const byId = new Map(roster.map((s) => [s.id, s]));

export function allSponsors(): readonly Sponsor[] {
  return roster;
}

export function getSponsor(id: string): Sponsor | undefined {
  return byId.get(id);
}

/** The default sponsor (full UNOMA funding) — used until the player picks. */
export const DEFAULT_SPONSOR = roster[0];
