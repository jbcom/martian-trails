import { GoogleGenAI } from "@google/genai";

/**
 * GenAI client — a thin, key-gated wrapper around @google/genai (Gemini), ported
 * from the maga-money-moves dev pipeline. This is the ONLY impure part; prompt
 * building + validation are pure and testable with an injected GenerateFn.
 * Generation is opt-in: it throws without a key, never silently no-ops.
 */

/** Pluggable generation function: (system, prompt) → raw model text. */
export type GenerateFn = (system: string, prompt: string) => Promise<string>;
/** Pluggable image generation: prompt → PNG/JPEG bytes, or null. */
export type GenerateImageFn = (prompt: string) => Promise<Uint8Array | null>;

export const DEFAULT_GEN_MODEL = "gemini-3.5-flash";
export const DEFAULT_IMAGE_MODEL = "imagen-4.0-fast-generate-001";

export function geminiGenerate(apiKey: string, model = DEFAULT_GEN_MODEL): GenerateFn {
  if (!apiKey) throw new Error("geminiGenerate: missing API key — generation needs a Gemini key");
  const ai = new GoogleGenAI({ apiKey });
  return async (system, prompt) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction: system, responseMimeType: "application/json" },
    });
    return res.text ?? "";
  };
}

export function geminiGenerateImage(apiKey: string, model = DEFAULT_IMAGE_MODEL): GenerateImageFn {
  if (!apiKey) throw new Error("geminiGenerateImage: missing API key");
  const ai = new GoogleGenAI({ apiKey });
  return async (prompt) => {
    const res = await ai.models.generateImages({ model, prompt, config: { numberOfImages: 1 } });
    const b64 = res?.generatedImages?.[0]?.image?.imageBytes;
    return b64 ? Buffer.from(b64, "base64") : null;
  };
}

/** Extract a JSON array from a model response (tolerates markdown fences / prose). */
export function parseGeneratedArray(text: string): unknown[] {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const arr = JSON.parse(trimmed.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Read the Gemini key from env or .env (gitignored). */
export function readGeminiKey(envText?: string): string | undefined {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  return envText?.match(/GEMINI_API_KEY=(\S+)/)?.[1];
}
