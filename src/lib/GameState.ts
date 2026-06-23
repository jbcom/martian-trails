import { writable } from "svelte/store";

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  alive: boolean;
  condition:
    | "Healthy"
    | "Radiation Sickness"
    | "Regolith Lung"
    | "Fracture"
    | "Hypothermia"
    | "Sickness";
}

export interface ResourceSet {
  oxygen: number;
  water: number;
  rations: number;
  power: number;
  parts: number;
  medkits: number;
  morale: number;
  hull: number;
  rtg: number;
}

export interface TerrainZone {
  name: string;
  speed: number;
  power: number;
  hullDamage: number;
  color: string;
}

export interface Outpost {
  dist: number;
  name: string;
  passed: boolean;
}

export interface GameState {
  mode: "depot" | "travel" | "outpost" | "event" | "gameover" | "victory";
  distance: number;
  sol: number;
  timeAccumulator: number;
  isDriving: boolean;
  pace: number; // 1: Steady, 1.5: Strenuous, 2: Grueling
  rationLevel: number; // 1: Filling, 0.5: Meager, 0.25: Bare Bones
  currentOutpost: Outpost | null;
  tradeOffer: {
    text: string;
    costType: keyof ResourceSet;
    costAmt: number;
    rewardType: keyof ResourceSet;
    rewardAmt: number;
    bonusPower?: boolean;
  } | null;
  upgrades: {
    scrubbers: boolean;
    suspension: boolean;
    solar: boolean;
  };
  terrain: TerrainZone;
  maxResources: Record<string, number>;
  resources: ResourceSet;
  crew: CrewMember[];
  weather: "clear" | "dust_storm";
  dayCycle: number;
}

export const CONSTANTS = {
  TOTAL_DISTANCE: 2500,
  BASE_SPEED: 35,
  MAX_CARGO: 1000,
  MAX_POWER_PER_RTG: 100,
  SOL_DURATION_MS: 3500,
  DRAIN: { OXYGEN: 1.0, WATER: 1.2, RATIONS: 1.2, MORALE: 1.2 },
  POWER_DRAIN_DRIVING: 6,
};

export const OUTPOSTS: Outpost[] = [
  { dist: 600, name: "Tharsis Outpost", passed: false },
  { dist: 1300, name: "Pavonis Mons Base", passed: false },
  { dist: 2000, name: "Noctis Labyrinthus", passed: false },
];

export const TERRAIN_ZONES: TerrainZone[] = [
  { name: "Smooth Regolith", speed: 1.0, power: 1.0, hullDamage: 0.5, color: "#cc7052" },
  { name: "Boulder Field", speed: 0.6, power: 1.5, hullDamage: 2.5, color: "#8a3324" },
  { name: "Deep Sand", speed: 0.4, power: 1.8, hullDamage: 0.8, color: "#a85b32" },
];

export const STORE_ITEMS = {
  oxygen: {
    name: "Liquid O2",
    desc: "Life support gas [kg]",
    price: 10,
    step: 50,
    max: 1000,
    qty: 0,
    isBulk: true,
  },
  water: {
    name: "Potable H2O",
    desc: "Drinking water [L]",
    price: 5,
    step: 50,
    max: 1000,
    qty: 0,
    isBulk: true,
  },
  rations: {
    name: "Rations",
    desc: "Dehydrated food [kg]",
    price: 8,
    step: 50,
    max: 1000,
    qty: 0,
    isBulk: true,
  },
  parts: {
    name: "Machined Parts",
    desc: "Mechanical repairs & Upgrades",
    price: 250,
    step: 1,
    max: 15,
    qty: 0,
    isBulk: false,
  },
  medkits: {
    name: "Medical Kits",
    desc: "Treats sickness & trauma",
    price: 400,
    step: 1,
    max: 10,
    qty: 0,
    isBulk: false,
  },
  rtg: {
    name: "RTG Cell",
    desc: "+100 Max Power Pool",
    price: 3000,
    step: 1,
    max: 4,
    qty: 1,
    isBulk: false,
  },
};

export const INITIAL_STATE: GameState = {
  mode: "depot",
  distance: 0,
  sol: 1,
  timeAccumulator: 0,
  isDriving: false,
  pace: 1,
  rationLevel: 1,
  currentOutpost: null,
  tradeOffer: null,
  upgrades: { scrubbers: false, suspension: false, solar: false },
  terrain: TERRAIN_ZONES[0],
  maxResources: { oxygen: 1000, water: 1000, rations: 1000, power: 100, morale: 100, hull: 100 },
  resources: {
    oxygen: 0,
    water: 0,
    rations: 0,
    power: 0,
    parts: 0,
    medkits: 0,
    morale: 100,
    hull: 100,
    rtg: 1,
  },
  crew: [
    { id: "john", name: "John", role: "Commander", alive: true, condition: "Healthy" },
    { id: "maya", name: "Maya", role: "Engineer", alive: true, condition: "Healthy" },
    { id: "frank", name: "Frank", role: "Geologist", alive: true, condition: "Healthy" },
    { id: "nadia", name: "Nadia", role: "Botanist", alive: true, condition: "Healthy" },
  ],
  weather: "clear",
  dayCycle: 0,
};

function createGameState() {
  const { subscribe, set, update } = writable<GameState>(JSON.parse(JSON.stringify(INITIAL_STATE)));

  return {
    subscribe,
    set,
    update,
    reset: () => set(JSON.parse(JSON.stringify(INITIAL_STATE))),

    buyItem: (key: keyof typeof STORE_ITEMS, qtyChange: number) => {
      update((s) => {
        const item = STORE_ITEMS[key];
        const cost = qtyChange * item.price;
        const currentPayload = s.resources.oxygen + s.resources.water + s.resources.rations;

        if (qtyChange > 0) {
          // Check limits
          if (item.isBulk && currentPayload + qtyChange > CONSTANTS.MAX_CARGO) return s;
          if (item.qty + qtyChange > item.max) return s;
          item.qty += qtyChange;
          s.resources[key] = item.qty;
        } else if (qtyChange < 0) {
          // Check lower boundary
          const minQty = key === "rtg" ? 1 : 0;
          if (item.qty + qtyChange < minQty) return s;
          item.qty += qtyChange;
          s.resources[key] = item.qty;
        }
        return s;
      });
    },
  };
}

export const gameState = createGameState();
export const eventLog = writable<
  Array<{ text: string; type: "normal" | "important" | "bad" | "good" | "system" }>
>([]);

export function logMsg(
  text: string,
  type: "normal" | "important" | "bad" | "good" | "system" = "normal",
) {
  eventLog.update((log) => [...log, { text, type }]);
}
