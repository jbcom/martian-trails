import outpostAdviceJson from "@/content/outpostAdvice.json";
import { type OutpostAdvicePair, outpostAdviceFileSchema } from "@/schemas/outpostAdvice";

const advicePairs: OutpostAdvicePair[] = outpostAdviceFileSchema.parse(outpostAdviceJson);
const adviceByOutpost = new Map(advicePairs.map((pair) => [pair.outpost, pair]));

if (adviceByOutpost.size !== advicePairs.length) {
  throw new Error("outpostAdvice.json contains duplicate outpost entries");
}

for (const pair of advicePairs) {
  const advisorIds = new Set([pair.veteran.id, pair.liaison.id]);
  for (const choice of pair.choices) {
    if (!advisorIds.has(choice.advisorId)) {
      throw new Error(`${pair.outpost}: choice ${choice.id} references missing advisor`);
    }
  }
}

export function allOutpostAdvicePairs(): readonly OutpostAdvicePair[] {
  return advicePairs;
}

export function adviceForOutpost(outpost: string): OutpostAdvicePair | undefined {
  return adviceByOutpost.get(outpost);
}
