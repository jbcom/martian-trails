import type { GenerateImageFn } from "@/genai/client";

/**
 * Crew portrait generation (Imagen) — pure prompt builders around an injected
 * GenerateImageFn. Each crew member gets one portrait in a LOCKED signature style
 * so the four cohere into one identity and sit alongside the 3D-PSX scenes
 * (docs/ART-DIRECTION.md). Ported from the maga-money-moves portrait pipeline.
 */

/** The locked PSX-era signature style — reused verbatim so portraits cohere. */
export const SIGNATURE_STYLE =
  "rendered as a late-1990s PS1-era 3D character portrait: low-polygon head-and-shoulders bust, " +
  "low-resolution affine-mapped textures, slight vertex jitter, chunky pixelated shading, CRT-soft " +
  "edges, a dim rust-and-ochre Mars-habitat backlight. Cohesive retro-PSX game look. " +
  "NOT photographic, NOT modern smooth 3D, NOT anime, NOT engraving.";

export const STYLE_NEGATIVE =
  "Avoid: high resolution, smooth modern render, photorealism, anime, cartoon, watermark, text, frame.";

export interface CrewFacet {
  id: string;
  name: string;
  role: string;
  /** Short visual cue per crew member for variety within the locked style. */
  look: string;
}

/** The four founding crew — visual cues chosen to read distinctly at PSX fidelity. */
export const CREW_FACETS: CrewFacet[] = [
  {
    id: "john",
    name: "John",
    role: "Commander",
    look: "weathered older man, steel-grey crew cut, lined face, calm authority",
  },
  {
    id: "maya",
    name: "Maya",
    role: "Engineer",
    look: "dark hair tied back, a tool-harness over the suit, an engineer's focused expression",
  },
  {
    id: "frank",
    name: "Frank",
    role: "Geologist",
    look: "broad bearded man, sun-darkened skin, sample-scanner clipped to collar",
  },
  {
    id: "nadia",
    name: "Nadia",
    role: "Botanist",
    look: "close-cropped hair, a faint green grow-light cast, a botanist's quiet resolve",
  },
];

export function buildPortraitPrompt(facet: CrewFacet): string {
  return (
    `Portrait of ${facet.name}, the ${facet.role} of a Mars colonization rover crew — ` +
    `${facet.look}, wearing a worn pressurized EVA suit with the helmet off, ${SIGNATURE_STYLE} ${STYLE_NEGATIVE}`
  );
}

export interface GeneratedPortrait {
  id: string;
  bytes: Uint8Array;
}

/** Generate one portrait per crew facet. Skips (null) any the model declined. */
export async function generatePortraits(
  generateImage: GenerateImageFn,
  facets: CrewFacet[] = CREW_FACETS,
): Promise<GeneratedPortrait[]> {
  const out: GeneratedPortrait[] = [];
  for (const facet of facets) {
    const bytes = await generateImage(buildPortraitPrompt(facet));
    if (bytes) out.push({ id: facet.id, bytes });
  }
  return out;
}
