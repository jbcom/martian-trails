import { getCoDriver } from "@/content/coDrivers";
import type { CoDriver, CoDriverTrigger } from "@/schemas/coDriver";
import type { Loadout } from "@/sim/factories";

export interface CoDriverAdviceContext {
  sol: number;
  distance: number;
  resources: {
    oxygen: number;
    water: number;
    rations: number;
    power: number;
    parts: number;
    medkits: number;
    morale: number;
    hull: number;
    rtg: number;
  };
  maxResources: {
    oxygen: number;
    water: number;
    rations: number;
    power: number;
    morale: number;
    hull: number;
  };
  pace: string;
  rationLevel: string;
}

export interface CoDriverAdvice {
  trigger: CoDriverTrigger;
  text: string;
  misleading: boolean;
}

export interface CoDriverSnapshot {
  id: string;
  name: string;
  role: string;
  portrait: string;
  advice: CoDriverAdvice;
}

const LOADOUT_PATCH_FIELDS = ["oxygen", "water", "rations", "parts", "medkits", "rtg"] as const;

function ratio(value: number, max: number): number {
  return value / Math.max(1, max);
}

function currentTrigger(ctx: CoDriverAdviceContext): CoDriverTrigger {
  if (ratio(ctx.resources.hull, ctx.maxResources.hull) <= 0.35) return "low-hull";
  if (ratio(ctx.resources.water, ctx.maxResources.water) <= 0.35) return "low-water";
  if (ratio(ctx.resources.oxygen, ctx.maxResources.oxygen) <= 0.35) return "low-oxygen";
  if (ratio(ctx.resources.rations, ctx.maxResources.rations) <= 0.35) return "low-rations";
  if (ctx.pace === "grueling") return "high-pace";
  if (ctx.rationLevel !== "filling") return "tight-rations";
  return "steady";
}

function hashUnit(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function applyCoDriverLoadoutPatch(loadout: Loadout): Loadout {
  if (!loadout.coDriverId) return loadout;
  const coDriver = getCoDriver(loadout.coDriverId);
  if (!coDriver) return loadout;

  const patched: Loadout = { ...loadout };
  for (const field of LOADOUT_PATCH_FIELDS) {
    const delta = coDriver.loadoutPatch[field] ?? 0;
    if (delta === 0) continue;
    const floor = field === "rtg" ? 1 : 0;
    patched[field] = Math.max(floor, patched[field] + delta);
  }
  return patched;
}

export function selectCoDriverAdvice(
  coDriverId: string,
  ctx: CoDriverAdviceContext,
): CoDriverAdvice | null {
  const coDriver = getCoDriver(coDriverId);
  if (!coDriver) return null;

  const trigger = currentTrigger(ctx);
  const authored =
    coDriver.advice.find((line) => line.trigger === trigger) ??
    coDriver.advice.find((line) => line.trigger === "steady");
  if (!authored) return null;

  const situationKey = [
    coDriver.id,
    trigger,
    ctx.sol,
    Math.floor(ctx.distance / 100),
    ctx.pace,
    ctx.rationLevel,
  ].join("|");
  const misleading = hashUnit(situationKey) > authored.reliability;

  return {
    trigger,
    text: misleading ? authored.misleadingLine : authored.line,
    misleading,
  };
}

export function buildCoDriverSnapshot(
  coDriverId: string | null,
  ctx: CoDriverAdviceContext,
): CoDriverSnapshot | null {
  if (!coDriverId) return null;
  const coDriver: CoDriver | undefined = getCoDriver(coDriverId);
  const advice = selectCoDriverAdvice(coDriverId, ctx);
  if (!coDriver || !advice) return null;
  return {
    id: coDriver.id,
    name: coDriver.name,
    role: coDriver.role,
    portrait: coDriver.portrait,
    advice,
  };
}
