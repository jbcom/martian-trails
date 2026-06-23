<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { sfx } from "./lib/AudioEngine";
import {
  CONSTANTS,
  INITIAL_STATE,
  OUTPOSTS,
  STORE_ITEMS,
  TERRAIN_ZONES,
  eventLog,
  gameState,
  logMsg,
} from "./lib/GameState";
import type { CrewMember, GameState, ResourceSet } from "./lib/GameState";
import { Renderer } from "./lib/Renderer";
import "./global.css";

let container: HTMLDivElement;
let renderer: Renderer;
let currentState: GameState;

// Safe subscription to avoid closure-stale states inside the high-frequency tick loop
const unsubscribe = gameState.subscribe((s) => {
  currentState = s;
});

onMount(() => {
  renderer = new Renderer(container);

  // Wire up the high-frequency update ticker
  renderer.app.ticker.add(() => {
    if (renderer && currentState) {
      renderer.update(currentState);
      tickEngine();
    }
  });

  window.addEventListener("resize", handleResize);
});

onDestroy(() => {
  unsubscribe();
  if (renderer) renderer.destroy();
  window.removeEventListener("resize", handleResize);
});

function handleResize() {
  if (renderer) renderer.resize();
}

// --- Core Game Simulation Tick Engine ---
function tickEngine() {
  if (currentState.mode !== "travel" || !currentState.isDriving) return;

  const delta = renderer.app.ticker.deltaTime;
  const isMoving = currentState.isDriving && currentState.resources.power > 0;

  if (isMoving) {
    // Play driving engine hum periodically
    if (Date.now() % 200 < 20) {
      sfx.playTone(40 + currentState.pace * 10, "sine", 0.2, 0.02);
    }

    // Distance advancement math
    const speed =
      (CONSTANTS.BASE_SPEED / 60) * delta * currentState.pace * currentState.terrain.speed;
    const newDistance = currentState.distance + speed * 0.4;

    // Accumulate time towards Sol passage
    const newTimeAccumulator = currentState.timeAccumulator + renderer.app.ticker.deltaMS;
    const newDayCycle = newTimeAccumulator / CONSTANTS.SOL_DURATION_MS;

    // Hull wear and power drain calculations
    let hDamage =
      (currentState.terrain.hullDamage / 60) * delta * (currentState.pace * currentState.pace);
    if (currentState.upgrades.suspension) hDamage *= 0.7;

    let pDrain =
      (CONSTANTS.POWER_DRAIN_DRIVING / 60) *
      delta *
      (currentState.pace * currentState.pace) *
      currentState.terrain.power;
    if (currentState.resources.hull < 30) pDrain *= 1.5;

    // Temperature power adjustments
    const currentTemp = calculateTemp(newDayCycle);
    if (currentTemp < -60) {
      let coldDrain = Math.abs(currentTemp + 60) * 0.02;
      if (currentState.upgrades.solar) coldDrain *= 0.5; // Insulation effect
      pDrain += coldDrain * delta;
    }

    gameState.update((s) => {
      s.distance = newDistance;
      s.timeAccumulator = newTimeAccumulator;
      s.dayCycle = newDayCycle;
      s.resources.hull = Math.max(0, s.resources.hull - hDamage);
      s.resources.power = Math.max(0, s.resources.power - pDrain);

      // Check for transition to upcoming outposts programmatically
      for (const wp of OUTPOSTS) {
        if (!wp.passed && s.distance >= wp.dist) {
          wp.passed = true;
          s.isDriving = false;
          s.mode = "outpost";
          s.currentOutpost = wp;

          renderer.triggerAirlockClose(() => {
            sfx.mech();
            setupTradeOffer(s);
          });
        }
      }

      // Trigger random terrain zone shifts
      if (Math.random() < 0.0005 * delta && s.distance > 100) {
        const newT = TERRAIN_ZONES[Math.floor(Math.random() * TERRAIN_ZONES.length)];
        if (newT.name !== s.terrain.name) {
          s.terrain = newT;
          logMsg(`Entered Zone: ${newT.name}`, "system");
        }
      }

      // Check destination arrival
      if (s.distance >= CONSTANTS.TOTAL_DISTANCE) {
        s.mode = "victory";
        sfx.good();
      }

      return s;
    });
  }

  // Sol passage boundary transition
  if (currentState.timeAccumulator >= CONSTANTS.SOL_DURATION_MS) {
    gameState.update((s) => {
      s.timeAccumulator -= CONSTANTS.SOL_DURATION_MS;
      s.sol++;

      applyDailyVitalsConsumption(s);

      // Solar Arrays morning re-charge
      let recharge = s.weather === "dust_storm" ? 2 : 25;
      if (s.upgrades.solar && s.weather !== "dust_storm") recharge *= 1.4;
      s.resources.power = Math.min(s.maxResources.power, s.resources.power + recharge);

      // Process systemic health failure and event chances
      checkCrewVitals(s);

      if (s.mode === "travel" && s.isDriving) {
        let evChance = 0.12;
        if (s.pace === 1.5) evChance = 0.18;
        if (s.pace === 2) evChance = 0.25;
        if (s.upgrades.suspension) evChance *= 0.5;

        if (Math.random() < evChance) {
          triggerRandomAnomaly(s);
        }
      }

      return s;
    });
  }

  // Trigger flashing visual warning sirens
  if (currentState.mode === "travel") {
    const alarmActive =
      currentState.resources.oxygen < 100 ||
      currentState.resources.water < 100 ||
      currentState.resources.hull < 20;
    if (alarmActive && Date.now() % 1000 < 20) {
      sfx.alarm();
    }
  }
}

// --- Sub-Systems Helpers ---
function calculateTemp(dayCycle: number): number {
  let temp = -60 + Math.sin(dayCycle * Math.PI * 2 - Math.PI / 2) * 40;
  if (currentState.weather === "dust_storm") temp -= 20;
  return temp;
}

function setupTradeOffer(s: GameState) {
  const trades = [
    {
      text: "Trade 100 Rations for 2 Parts?",
      costType: "rations" as keyof ResourceSet,
      costAmt: 100,
      rewardType: "parts" as keyof ResourceSet,
      rewardAmt: 2,
    },
    {
      text: "Trade 1 Medkit for Full Power & 1 Part?",
      costType: "medkits" as keyof ResourceSet,
      costAmt: 1,
      rewardType: "parts" as keyof ResourceSet,
      rewardAmt: 1,
      bonusPower: true,
    },
    {
      text: "Trade 150L Water for 100kg Oxygen?",
      costType: "oxygen" as keyof ResourceSet,
      costAmt: 100,
      rewardType: "water" as keyof ResourceSet,
      rewardAmt: 150,
    },
  ];
  s.tradeOffer = trades[Math.floor(Math.random() * trades.length)];
}

function applyDailyVitalsConsumption(s: GameState) {
  const alive = s.crew.filter((c) => c.alive).length;
  if (alive === 0) return;

  const sMult = isCrewAlive(s, "nadia") ? 0.8 : 1.0;
  s.resources.oxygen -= CONSTANTS.DRAIN.OXYGEN * alive * (s.upgrades.scrubbers ? 0.75 : 1);
  s.resources.water -= CONSTANTS.DRAIN.WATER * alive * sMult;
  s.resources.rations -= CONSTANTS.DRAIN.RATIONS * alive * sMult * s.rationLevel;

  let mDrop = CONSTANTS.DRAIN.MORALE * (isCrewAlive(s, "john") ? 0.5 : 1.0);
  if (s.resources.water <= 0) mDrop += 15;
  if (s.resources.rations <= 0) mDrop += 10;
  if (s.rationLevel < 1) mDrop += (1 - s.rationLevel) * 15;
  if (s.pace > 1 && s.isDriving) mDrop += (s.pace - 1) * 8;
  s.resources.morale = Math.max(0, s.resources.morale - mDrop);

  // Limit vitals bottom threshold
  s.resources.oxygen = Math.max(0, s.resources.oxygen);
  s.resources.water = Math.max(0, s.resources.water);
  s.resources.rations = Math.max(0, s.resources.rations);

  // Sickness/injuries degradation progression
  for (const c of s.crew.filter((c) => c.alive && c.condition !== "Healthy")) {
    if (Math.random() < 0.15) {
      c.alive = false;
      logMsg(`${c.name} succumbed to ${c.condition}.`, "bad");
      s.resources.morale = Math.max(0, s.resources.morale - 20);
      sfx.bad();
    } else {
      logMsg(`${c.name} is sick: ${c.condition}.`, "bad");
      s.resources.morale = Math.max(0, s.resources.morale - 5);
    }
  }
}

function checkCrewVitals(s: GameState) {
  const aliveCount = s.crew.filter((c) => c.alive).length;

  if (aliveCount > 0 && s.resources.morale <= 10 && Math.random() < 0.1) {
    const survivors = s.crew.filter((c) => c.alive);
    const casualty = survivors[Math.floor(Math.random() * survivors.length)];
    casualty.alive = false;
    logMsg(`${casualty.name} abandoned the expedition due to despair.`, "bad");
  }

  if (s.crew.filter((c) => c.alive).length === 0) {
    s.mode = "gameover";
    logMsg("Expedition failed. All crew deceased.", "bad");
  } else if (s.resources.oxygen <= 0) {
    s.mode = "gameover";
    logMsg("Life support failure. Asphyxiation.", "bad");
  } else if (s.resources.hull <= 0) {
    s.mode = "gameover";
    logMsg("Catastrophic hull failure. Rover depressurized.", "bad");
  }
}

function isCrewAlive(s: GameState, id: string): boolean {
  const c = s.crew.find((x) => x.id === id);
  return !!c?.alive;
}

// --- Random Event Anomaly Pools ---
interface EventOption {
  label: string;
  condition?: () => boolean;
  action: () => void;
}
interface ActiveEvent {
  title: string;
  desc: string;
  options: EventOption[];
}

let activeEvent: ActiveEvent | null = null;

function triggerRandomAnomaly(s: GameState) {
  s.isDriving = false;
  s.mode = "event";
  sfx.error();

  const anomalies = [
    {
      title: "Crevasse Blockage",
      desc: "A deep tectonic fracture blocks the path forward.",
      options: [
        {
          label: "Build Bridge (1 Part)",
          condition: () => currentState.resources.parts > 0,
          action: () => {
            gameState.update((st) => {
              st.resources.parts--;
              logMsg("Successfully bridged the tectonic crevasse.", "good");
              resumeDriving(st);
              return st;
            });
          },
        },
        {
          label: "Take Long Detour (3 Sols)",
          action: () => {
            gameState.update((st) => {
              st.sol += 3;
              applyDailyVitalsConsumption(st);
              logMsg("Took a grueling 3-Sol detour.", "bad");
              resumeDriving(st);
              return st;
            });
          },
        },
      ],
    },
    {
      title: "Regolith Dust Devil",
      desc: "An aggressive dust whirlwind blasts the side paneling.",
      options: [
        {
          label: "Deploy External Deflectors",
          action: () => {
            gameState.update((st) => {
              st.resources.power = Math.max(0, st.resources.power - 15);
              logMsg("Deflectors held, but battery core drained.", "normal");
              resumeDriving(st);
              return st;
            });
          },
        },
        {
          label: "Take the Hit",
          action: () => {
            gameState.update((st) => {
              st.resources.hull = Math.max(0, st.resources.hull - 20);
              logMsg("Dust devils sheared the outer panel shielding.", "bad");
              resumeDriving(st);
              return st;
            });
          },
        },
      ],
    },
  ];

  const ev = anomalies[Math.floor(Math.random() * anomalies.length)];
  activeEvent = {
    title: ev.title,
    desc: ev.desc,
    options: ev.options.map((o) => ({
      label: o.label,
      condition: o.condition,
      action: () => {
        o.action();
        activeEvent = null;
      },
    })),
  };
}

function resumeDriving(s: GameState) {
  s.mode = "travel";
  s.isDriving = true;
  sfx.good();
}

// --- Depot Requisition Transactions ---
let depotBudget = STORE_ITEMS.oxygen.price * STORE_ITEMS.oxygen.max; // Starting budget proxy

function handleRequisition(key: keyof typeof STORE_ITEMS, amt: number) {
  const item = STORE_ITEMS[key];
  const cost = amt * item.price;
  const currentPayload =
    currentState.resources.oxygen + currentState.resources.water + currentState.resources.rations;

  if (amt > 0) {
    if (depotBudget < cost) return sfx.error();
    if (item.isBulk && currentPayload + amt > CONSTANTS.MAX_CARGO) return sfx.error();
    if (item.qty + amt > item.max) return sfx.error();

    depotBudget -= cost;
    gameState.buyItem(key, amt);
    sfx.click();
  } else if (amt < 0) {
    const minQty = key === "rtg" ? 1 : 0;
    if (item.qty + amt < minQty) return sfx.error();

    depotBudget += Math.abs(cost);
    gameState.buyItem(key, amt);
    sfx.click();
  }
}

function launchAresExpedition() {
  sfx.mech();

  // Set starting power core based on RTGs purchased
  gameState.update((s) => {
    s.maxResources.power = s.resources.rtg * CONSTANTS.MAX_POWER_PER_RTG;
    s.resources.power = s.maxResources.power;
    return s;
  });

  renderer.triggerAirlockOpen(() => {
    gameState.update((s) => {
      s.mode = "travel";
      s.isDriving = true;
      return s;
    });
    logMsg("ARES NAVIGATION CORES ONLINE. DEPARTED UNDERHILL AIRLOCK.", "system");
    sfx.good();
  });
}

// --- Outpost Functions ---
function restAtOutpost() {
  if (currentState.resources.rations < 10 || currentState.resources.water < 10) {
    logMsg("Insufficient vitals to allocate resting Sols.", "bad");
    sfx.error();
    return;
  }

  gameState.update((s) => {
    s.sol += 3;
    s.resources.rations = Math.max(0, s.resources.rations - 25);
    s.resources.water = Math.max(0, s.resources.water - 25);
    s.resources.morale = Math.min(100, s.resources.morale + 60);
    s.resources.power = s.maxResources.power;
    for (const c of s.crew) {
      if (c.alive) c.condition = "Healthy";
    }
    logMsg(`Expedition rested inside ${s.currentOutpost?.name}. Morale restored.`, "good");
    return s;
  });
  sfx.good();
}

function acceptLocalTrade() {
  const offer = currentState.tradeOffer;
  if (!offer) return;

  if (currentState.resources[offer.costType] >= offer.costAmt) {
    gameState.update((s) => {
      s.resources[offer.costType] = (s.resources[offer.costType] as number) - offer.costAmt;
      s.resources[offer.rewardType] = (s.resources[offer.rewardType] as number) + offer.rewardAmt;
      if (offer.bonusPower) {
        s.resources.power = s.maxResources.power;
      }
      s.tradeOffer = null;
      logMsg("Airlock trade transaction completed.", "good");
      return s;
    });
    sfx.good();
  } else {
    sfx.error();
  }
}

function leaveOutpost() {
  renderer.triggerAirlockOpen(() => {
    gameState.update((s) => {
      s.mode = "travel";
      s.isDriving = true;
      s.currentOutpost = null;
      logMsg("Departed secure station. Back on the Ares Trail.", "system");
      return s;
    });
    sfx.good();
  });
}

// --- Subsystem Installations & Operations ---
let isLogisticsOpen = false;

function installSubsystem(key: "scrubbers" | "suspension" | "solar") {
  const cost = key === "suspension" ? 4 : 3;
  if (currentState.resources.parts >= cost && !currentState.upgrades[key]) {
    gameState.update((s) => {
      s.resources.parts -= cost;
      s.upgrades[key] = true;
      logMsg(
        `Installed Upgrade: ${key === "scrubbers" ? "CO2 Scrubbers" : key === "suspension" ? "Active Suspension" : "High-Yield Solar"}`,
        "good",
      );
      return s;
    });
    sfx.good();
  } else {
    sfx.error();
  }
}

function adjustPacing(val: number) {
  gameState.update((s) => {
    s.pace = val;
    logMsg(`Operational speed updated to speed factor x${val}.`, "system");
    return s;
  });
  sfx.click();
}

function adjustRations(val: number) {
  gameState.update((s) => {
    s.rationLevel = val;
    logMsg(
      `Rations allocated set to ${val === 1 ? "Filling" : val === 0.5 ? "Meager" : "Bare Bones"}.`,
      "system",
    );
    return s;
  });
  sfx.click();
}

// --- Driver Repairs Operations ---
function triggerEVA() {
  if (currentState.isDriving) {
    logMsg("Halt driving before deploying crew on EVA prospecting.", "bad");
    return sfx.error();
  }
  if (currentState.resources.oxygen < 15) {
    logMsg("Insufficient O2 reserves for EVA pressure suit cycling.", "bad");
    return sfx.error();
  }

  gameState.update((s) => {
    s.resources.oxygen -= 15;
    s.sol++;
    applyDailyVitalsConsumption(s);

    const roll = Math.random();
    if (roll < 0.15) {
      s.resources.parts++;
      logMsg("EVA Prospecting: Discovered 1 Machined Part.", "good");
      sfx.good();
    } else if (roll < 0.5) {
      const yieldAmt = isCrewAlive(s, "frank") ? 100 : 50;
      s.resources.water = Math.min(s.maxResources.water, s.resources.water + yieldAmt);
      logMsg(`EVA Prospecting: Frank located ice shelf, mined ${yieldAmt}L Water.`, "good");
      sfx.good();
    } else {
      logMsg("EVA returned nothing of scientific value.", "bad");
      sfx.bad();

      if (Math.random() < 0.3) {
        const healthy = s.crew.filter((c) => c.alive && c.condition === "Healthy");
        if (healthy.length > 0) {
          const injured = healthy[Math.floor(Math.random() * healthy.length)];
          injured.condition = "Fracture";
          logMsg(`Tragedy: ${injured.name} suffered a fracture during EVA!`, "bad");
        }
      }
    }
    return s;
  });
}

function repairRoverHull() {
  if (currentState.isDriving) {
    logMsg("Halt driving before performing structural repairs.", "bad");
    return sfx.error();
  }
  if (currentState.resources.parts < 1 || currentState.resources.hull >= 100) {
    return sfx.error();
  }

  gameState.update((s) => {
    s.resources.parts--;
    s.sol += 0.5;
    const engineerBonus = isCrewAlive(s, "maya") ? 15 : 0;
    s.resources.hull = Math.min(100, s.resources.hull + 25 + engineerBonus);
    logMsg(`Structural paneling repaired by ${25 + engineerBonus}%.`, "good");
    return s;
  });
  sfx.good();
}

function treatCrewInjuries() {
  if (currentState.isDriving) {
    logMsg("Halt driving before dispensing high-grade medical drugs.", "bad");
    return sfx.error();
  }
  const patients = currentState.crew.filter((c) => c.alive && c.condition !== "Healthy");
  if (patients.length === 0 || currentState.resources.medkits < 1) {
    return sfx.error();
  }

  gameState.update((s) => {
    s.resources.medkits--;
    s.sol++;
    for (const p of patients) {
      p.condition = "Healthy";
    }
    s.resources.morale = Math.min(100, s.resources.morale + 10);
    logMsg("Afflicted crew fully recovered.", "good");
    return s;
  });
  sfx.good();
}

function calculateFinalScore(): number {
  if (!currentState) return 0;
  const survivors = currentState.crew.filter((c) => c.alive).length;
  const baseVal = 1000 + survivors * 500;
  const cargoBonus = Math.floor(
    (currentState.resources.oxygen +
      currentState.resources.water +
      currentState.resources.rations) /
      5,
  );
  const solPen = currentState.sol * 15;
  return Math.max(0, baseVal + cargoBonus - solPen);
}
</script>

<div class="game-wrapper">
  <!-- PixiJS WebGL Render Layer -->
  <div bind:this={container} class="pixi-viewport"></div>

  {#if currentState}
    <!-- Master overlay layout wrapper -->
    <div class="overlay-ui">
      
      <!-- Top mini-map tracking progress -->
      {#if currentState.mode !== 'depot'}
        <div class="progress-bar-container">
          <div class="progress-fill" style="width: {(currentState.distance / CONSTANTS.TOTAL_DISTANCE) * 100}%"></div>
          <div class="rover-marker" style="left: {(currentState.distance / CONSTANTS.TOTAL_DISTANCE) * 100}%">
            ▲
          </div>
          {#each OUTPOSTS as wp}
            <div class="waypoint-marker" style="left: {(wp.dist / CONSTANTS.TOTAL_DISTANCE) * 100}%">
              <span class="tooltip">{wp.name}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- DEPOT SCREEN INITIAL OUTFITTING OVERLAY -->
      {#if currentState.mode === 'depot'}
        <div class="depot-overlay">
          <div class="manifest-panel glass-panel">
            <div class="manifest-header">
              <h1>UNDERHILL DEPOT</h1>
              <span class="manifest-subtitle">UNOMA Quartermaster Interface</span>
            </div>
            <div class="manifest-body">
              <div class="payload-meter">
                <div class="payload-labels">
                  <span>Rover Payload</span>
                  <span>{Math.floor(currentState.resources.oxygen + currentState.resources.water + currentState.resources.rations)} / {CONSTANTS.MAX_CARGO} kg</span>
                </div>
                <div class="payload-bar-bg">
                  <div class="payload-bar-fill" style="width: {((currentState.resources.oxygen + currentState.resources.water + currentState.resources.rations) / CONSTANTS.MAX_CARGO) * 100}%"></div>
                </div>
              </div>

              <div class="budget-panel">
                <h3>Available Funds</h3>
                <span class="budget-amt">{depotBudget} CR</span>
              </div>

              <div class="store-scroller">
                {#each Object.entries(STORE_ITEMS) as [key, item]}
                  <div class="store-item">
                    <div class="store-meta">
                      <h4>{item.name}</h4>
                      <span>{item.desc} - {item.price} CR</span>
                    </div>
                    <div class="store-interact">
                      <button class="store-btn" on:click={() => handleRequisition(key, -item.step)}>-</button>
                      <span class="store-qty">{item.qty}</span>
                      <button class="store-btn" on:click={() => handleRequisition(key, item.step)}>+</button>
                    </div>
                  </div>
                {/each}
              </div>

              <button class="control-btn active launch-btn" on:click={launchAresExpedition}>
                Clear Airlock & Depart
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- SECURE OUTPOST STATION SCREEN -->
      {#if currentState.mode === 'outpost'}
        <div class="outpost-overlay">
          <div class="manifest-panel glass-panel">
            <div class="manifest-header">
              <h1>{currentState.currentOutpost?.name || 'OUTPOST'}</h1>
              <span class="manifest-subtitle">Pressurized Safe Zone</span>
            </div>
            <div class="manifest-body">
              <p class="description">Rover is fully locked in base garage. Grid connection active.</p>

              <button class="control-btn outpost-action" on:click={restAtOutpost}>
                Rest in Habitat (3 Sols)<br/>
                <span class="subtext">Fully heals crew and restores morale. Cost: 25 Rations/Water.</span>
              </button>

              {#if currentState.tradeOffer}
                <div class="trade-bay">
                  <p class="trade-desc">"{currentState.tradeOffer.text}"</p>
                  <div class="trade-controls">
                    <button class="control-btn active" on:click={acceptLocalTrade}>Accept Trade</button>
                    <button class="control-btn" on:click={() => gameState.update(st => { st.tradeOffer = null; return st; })}>Decline</button>
                  </div>
                </div>
              {/if}

              <button class="control-btn active leave-btn" on:click={leaveOutpost}>
                Cycle Airlock & Resume Trail
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- STANDARD HUD LAYER FOR ACTIVE TRAVELING -->
      {#if currentState.mode === 'travel' || currentState.mode === 'event'}
        <div class="travel-hud">
          <!-- Left side team roster metrics -->
          <div class="hud-panel glass-panel team-panel">
            <div class="hud-header">
              <h2>ARES CREW</h2>
              <div class="right-header">
                <span class="temp-val">{Math.floor(calculateTemp(currentState.dayCycle))}°C</span>
                <span class="day-val">SOL {currentState.sol}</span>
              </div>
            </div>

            <div class="metric-block">
              <div class="metric-label">
                <span>Crew Morale</span>
                <span>{Math.floor(currentState.resources.morale)}%</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill morale" style="width: {currentState.resources.morale}%"></div>
              </div>
            </div>

            <div class="crew-roster">
              {#each currentState.crew as member}
                <div class="member-row {member.alive ? '' : 'deceased'}">
                  <div>
                    <strong class="member-name">{member.name}</strong>
                    <span class="member-role">({member.role})</span>
                  </div>
                  {#if member.alive}
                    <span class="condition-badge {member.condition === 'Healthy' ? 'healthy' : 'sick'}">{member.condition}</span>
                  {:else}
                    <span class="condition-badge sick">KIA</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <!-- Mid bulk payload metrics -->
          <div class="hud-panel glass-panel cargo-panel">
            <h2>VITALS PAYLOAD</h2>
            
            <div class="metric-block">
              <div class="metric-label">
                <span>Oxygen</span>
                <span>{Math.floor(currentState.resources.oxygen)} kg</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: {(currentState.resources.oxygen / currentState.maxResources.oxygen) * 100}%"></div>
              </div>
            </div>

            <div class="metric-block">
              <div class="metric-label">
                <span>Water</span>
                <span>{Math.floor(currentState.resources.water)} L</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: {(currentState.resources.water / currentState.maxResources.water) * 100}%"></div>
              </div>
            </div>

            <div class="metric-block">
              <div class="metric-label">
                <span>Rations</span>
                <span>{Math.floor(currentState.resources.rations)} kg</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: {(currentState.resources.rations / currentState.maxResources.rations) * 100}%"></div>
              </div>
            </div>

            <div class="inventory-bar">
              <span>Parts: <strong>{currentState.resources.parts}</strong></span>
              <span>Medkits: <strong>{currentState.resources.medkits}</strong></span>
            </div>
          </div>

          <!-- Right side vehicle systems control console -->
          <div class="hud-panel glass-panel vehicle-panel">
            <div class="hud-header">
              <h2>ROVER SUBSYSTEMS</h2>
              <span class="terrain-label">{currentState.terrain.name}</span>
            </div>

            <div class="metric-block">
              <div class="metric-label">
                <span>Power Core</span>
                <span>{Math.floor(currentState.resources.power)}%</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill power" style="width: {(currentState.resources.power / currentState.maxResources.power) * 100}%"></div>
              </div>
            </div>

            <div class="metric-block">
              <div class="metric-label">
                <span>Hull Integrity</span>
                <span>{Math.floor(currentState.resources.hull)}%</span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill hull" style="width: {currentState.resources.hull}%"></div>
              </div>
            </div>

            <!-- Dashboard interactives -->
            <div class="dashboard-controls">
              <button class="control-btn {currentState.isDriving ? 'active' : ''}" on:click={() => gameState.update(s => { s.isDriving = !s.isDriving; return s; })}>
                {currentState.isDriving ? 'Driving' : 'Halted'}
              </button>
              <button class="control-btn" on:click={triggerEVA}>EVA Action</button>
              <button class="control-btn" on:click={repairRoverHull}>Repair Hull</button>
              <button class="control-btn" on:click={treatCrewInjuries}>Heal Crew</button>
              
              <button class="control-btn logistics-btn" on:click={() => isLogisticsOpen = true}>
                Logistics & Upgrades
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- MODALS AND MENUS POPUPS overlays -->

      <!-- LOGISTICS SETTINGS AND PERMANENT UPGRADES PANEL -->
      {#if isLogisticsOpen}
        <div class="modal-wrapper">
          <div class="modal-box glass-panel">
            <h2>Expedition Logistics</h2>
            <p class="meta-desc">Tune driving systems and install high-tech upgrades.</p>

            <h3>Speed Pacing</h3>
            <div class="toggle-group">
              <button class="toggle-btn {currentState.pace === 1 ? 'active' : ''}" on:click={() => adjustPacing(1)}>Steady</button>
              <button class="toggle-btn {currentState.pace === 1.5 ? 'active' : ''}" on:click={() => adjustPacing(1.5)}>Strenuous</button>
              <button class="toggle-btn {currentState.pace === 2 ? 'active' : ''}" on:click={() => adjustPacing(2)}>Grueling</button>
            </div>

            <h3>Rationing</h3>
            <div class="toggle-group">
              <button class="toggle-btn {currentState.rationLevel === 1 ? 'active' : ''}" on:click={() => adjustRations(1)}>Filling</button>
              <button class="toggle-btn {currentState.rationLevel === 0.5 ? 'active' : ''}" on:click={() => adjustRations(0.5)}>Meager</button>
              <button class="toggle-btn {currentState.rationLevel === 0.25 ? 'active' : ''}" on:click={() => adjustRations(0.25)}>Bare Bones</button>
            </div>

            <h3>Hardware Subsystems</h3>
            <div class="upgrades-list">
              <div class="upgrade-row">
                <div>
                  <h4>Carbon Scrubbers</h4>
                  <span>Cuts daily Oxygen drain by 25%.</span>
                </div>
                <button class="control-btn" disabled={currentState.upgrades.scrubbers || currentState.resources.parts < 3} on:click={() => installSubsystem('scrubbers')}>
                  {currentState.upgrades.scrubbers ? 'Installed' : '3 Parts'}
                </button>
              </div>

              <div class="upgrade-row">
                <div>
                  <h4>Active Suspension</h4>
                  <span>Reduces terrain damage by 30%.</span>
                </div>
                <button class="control-btn" disabled={currentState.upgrades.suspension || currentState.resources.parts < 4} on:click={() => installSubsystem('suspension')}>
                  {currentState.upgrades.suspension ? 'Installed' : '4 Parts'}
                </button>
              </div>

              <div class="upgrade-row">
                <div>
                  <h4>High-Yield Solar</h4>
                  <span>Boosts solar recharge rates by 40%.</span>
                </div>
                <button class="control-btn" disabled={currentState.upgrades.solar || currentState.resources.parts < 3} on:click={() => installSubsystem('solar')}>
                  {currentState.upgrades.solar ? 'Installed' : '3 Parts'}
                </button>
              </div>
            </div>

            <button class="control-btn active close-btn" on:click={() => isLogisticsOpen = false}>
              Confirm adjustments
            </button>
          </div>
        </div>
      {/if}

      <!-- RANDOM ENCOUNTER DIALOG POPUPS -->
      {#if activeEvent}
        <div class="modal-wrapper">
          <div class="modal-box glass-panel warning-border">
            <h2>{activeEvent.title}</h2>
            <p class="event-desc">{activeEvent.desc}</p>
            <div class="options-list">
              {#each activeEvent.options as option}
                <button class="control-btn active" disabled={option.condition && !option.condition()} on:click={option.action}>
                  {option.label}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- GAME OVER SCREEN OVERLAY -->
      {#if currentState.mode === 'gameover'}
        <div class="modal-wrapper">
          <div class="modal-box glass-panel gameover-box">
            <h1>EXPEDITION LOST</h1>
            <p class="fail-meta">The Ares Expedition is terminated. Mission compromised.</p>
            <button class="control-btn active reload-btn" on:click={() => window.location.reload()}>
              Re-initialize Mission
            </button>
          </div>
        </div>
      {/if}

      <!-- VICTORY FINAL SETTLEMENT OVERLAY -->
      {#if currentState.mode === 'victory'}
        <div class="modal-wrapper">
          <div class="modal-box glass-panel victory-box">
            <h1>KOROLEV REACHED</h1>
            <p class="victory-meta">The Ares Trail is conquered. You secured the colony's supply lines.</p>
            
            <div class="score-breakdown">
              <h3>UNOMA Mission Rating</h3>
              <div class="score-amt">{calculateFinalScore()} Points</div>
              <span class="sol-spent">Completed in {currentState.sol} Sols</span>
            </div>

            <button class="control-btn active reload-btn" on:click={() => window.location.reload()}>
              File Official Report
            </button>
          </div>
        </div>
      {/if}

      <!-- Interactive Logs Console list shown at the bottom -->
      {#if currentState.mode !== 'depot'}
        <div class="logs-console">
          <ul class="logs-list">
            {#each $eventLog as entry}
              <li class="log-entry {entry.type}">
                &gt; {entry.text}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  .game-wrapper {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-color: #000;
  }

  .pixi-viewport {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  .overlay-ui {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Progress Tracking Mini-map */
  .progress-bar-container {
    pointer-events: auto;
    width: 100%;
    height: 8px;
    background: rgba(0, 0, 0, 0.8);
    position: relative;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    z-index: 25;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--mars-red), var(--mars-sand));
    transition: width 0.3s ease;
  }

  .rover-marker {
    position: absolute;
    top: -6px;
    transform: translateX(-50%);
    color: var(--mars-sand);
    font-size: 1rem;
    text-shadow: 0 0 10px var(--mars-glow);
    transition: left 0.3s ease;
  }

  .waypoint-marker {
    position: absolute;
    top: 0;
    height: 8px;
    width: 3px;
    background: #fff;
    cursor: help;
  }

  .waypoint-marker .tooltip {
    visibility: hidden;
    background: #000;
    color: #fff;
    text-align: center;
    padding: 5px 8px;
    border-radius: 4px;
    position: absolute;
    z-index: 50;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.75rem;
    font-family: var(--font-display);
    white-space: nowrap;
    border: 1px solid var(--ui-border);
  }

  .waypoint-marker:hover .tooltip {
    visibility: visible;
  }

  /* Overlay Panels */
  .depot-overlay, .outpost-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    padding: 40px;
    align-items: center;
    z-index: 20;
  }

  .outpost-overlay {
    justify-content: flex-end;
  }

  .manifest-panel {
    pointer-events: auto;
    width: 450px;
    height: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    border-top: 3px solid var(--mars-sand);
  }

  .manifest-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .manifest-header h1 {
    font-size: 2rem;
    margin: 0;
    text-shadow: 0 0 15px rgba(232, 155, 113, 0.5);
  }

  .manifest-subtitle {
    color: var(--text-dim);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .manifest-body {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  /* Requisition Panel */
  .payload-meter {
    background: rgba(0, 0, 0, 0.5);
    padding: 15px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .payload-labels {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: var(--mars-sand);
  }

  .payload-bar-bg {
    height: 8px;
    background: #222;
    border-radius: 4px;
    margin-top: 8px;
    overflow: hidden;
  }

  .payload-bar-fill {
    height: 100%;
    background: var(--text-good);
    transition: width 0.3s ease;
  }

  .budget-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 10px;
  }

  .budget-amt {
    font-family: var(--font-display);
    font-size: 1.6rem;
    color: var(--text-good);
  }

  .store-scroller {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .store-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .store-meta h4 {
    color: var(--text-main);
    font-size: 0.95rem;
    margin-bottom: 2px;
  }

  .store-meta span {
    color: var(--text-dim);
    font-size: 0.75rem;
  }

  .store-interact {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 20px;
    padding: 2px 8px;
  }

  .store-btn {
    background: transparent;
    border: none;
    color: var(--mars-sand);
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 1.1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .store-qty {
    width: 40px;
    text-align: center;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: bold;
  }

  .launch-btn, .leave-btn {
    width: 100%;
    padding: 15px;
    font-size: 1.1rem;
    margin-top: auto;
  }

  /* Outpost Overlays */
  .description {
    font-size: 0.9rem;
    color: var(--text-main);
    margin-bottom: 10px;
  }

  .outpost-action {
    padding: 12px;
    width: 100%;
    text-align: left;
    margin-bottom: 10px;
  }

  .outpost-action .subtext {
    font-size: 0.75rem;
    color: var(--text-dim);
    text-transform: none;
  }

  .trade-bay {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--ui-border);
    padding: 15px;
    border-radius: 4px;
  }

  .trade-desc {
    color: var(--mars-sand);
    font-style: italic;
    font-size: 0.85rem;
    margin-bottom: 12px;
  }

  .trade-controls {
    display: flex;
    gap: 10px;
  }

  /* Travel HUD styling overlays */
  .travel-hud {
    position: absolute;
    top: 25px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 15px 30px;
  }

  .hud-panel {
    pointer-events: auto;
    flex: 1;
    padding: 15px;
    border-top: 2px solid var(--mars-red);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .right-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .temp-val {
    color: #4da6ff;
    font-family: var(--font-display);
    font-weight: bold;
  }

  .day-val {
    background: rgba(0, 0, 0, 0.5);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: var(--font-display);
    font-weight: bold;
    color: var(--mars-sand);
  }

  .metric-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  .bar-bg {
    background: #111;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--mars-dust);
    transition: width 0.3s ease;
  }

  .bar-fill.morale {
    background: #b070cc;
  }

  .bar-fill.power {
    background: #4da6ff;
  }

  .bar-fill.hull {
    background: #e6b800;
  }

  .crew-roster {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .member-row {
    display: flex;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.3);
    padding: 6px 10px;
    border-radius: 4px;
    border-left: 2px solid var(--mars-dust);
    align-items: center;
  }

  .member-row.deceased {
    opacity: 0.4;
    text-decoration: line-through;
    border-left-color: var(--text-alert);
  }

  .member-name {
    font-size: 0.85rem;
    color: var(--text-main);
  }

  .member-role {
    font-size: 0.7rem;
    color: var(--text-dim);
  }

  .condition-badge {
    font-family: var(--font-display);
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: bold;
  }

  .condition-badge.healthy {
    color: var(--text-good);
  }

  .condition-badge.sick {
    color: var(--text-alert);
  }

  .inventory-bar {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  .terrain-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .dashboard-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-top: auto;
  }

  .logistics-btn {
    grid-column: span 2;
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text-dim);
  }

  /* Modals Overlay structures */
  .modal-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    backdrop-filter: blur(5px);
    pointer-events: auto;
  }

  .modal-box {
    width: 500px;
    padding: 30px;
    border-top: 3px solid var(--mars-red);
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .modal-box.warning-border {
    border-top-color: var(--mars-sand);
  }

  .modal-box.gameover-box {
    border-top-color: var(--text-alert);
    text-align: center;
  }

  .modal-box.victory-box {
    border-top-color: var(--text-good);
    text-align: center;
  }

  .meta-desc, .fail-meta, .victory-meta {
    font-size: 0.85rem;
    color: var(--text-dim);
  }

  .toggle-group {
    display: flex;
    gap: 5px;
  }

  .toggle-btn {
    flex: 1;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #444;
    color: #999;
    padding: 8px;
    cursor: pointer;
    font-family: var(--font-display);
    text-transform: uppercase;
    font-weight: bold;
    border-radius: 4px;
    transition: 0.2s;
  }

  .toggle-btn.active {
    background: var(--mars-sand);
    color: #000;
    border-color: var(--mars-sand);
  }

  .upgrades-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .upgrade-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.3);
    padding: 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .upgrade-row h4 {
    font-size: 0.95rem;
    color: var(--mars-sand);
  }

  .upgrade-row span {
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .close-btn {
    width: 100%;
    padding: 12px;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .score-breakdown {
    background: rgba(0, 0, 0, 0.5);
    padding: 15px;
    border-radius: 4px;
    margin: 15px 0;
  }

  .score-amt {
    font-size: 2rem;
    color: var(--text-good);
    font-family: var(--font-display);
    margin: 5px 0;
  }

  .sol-spent {
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  /* Interactive Live Console log lists at bottom */
  .logs-console {
    pointer-events: auto;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.9) 0%, transparent 100%);
    padding: 40px 30px 20px 30px;
    height: 25vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .logs-list {
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    font-family: 'Courier New', Courier, monospace;
    text-shadow: 1px 1px 0px #000;
    max-height: 100%;
  }

  .log-entry {
    animation: slideIn 0.3s ease-out;
    border-left: 2px solid transparent;
    padding-left: 10px;
  }

  .log-entry.important {
    color: var(--mars-sand);
    font-weight: bold;
    border-left-color: var(--mars-sand);
  }

  .log-entry.bad {
    color: var(--text-alert);
    border-left-color: var(--text-alert);
  }

  .log-entry.good {
    color: var(--text-good);
    border-left-color: var(--text-good);
  }

  .log-entry.system {
    color: #4da6ff;
    border-left-color: #4da6ff;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-15px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
