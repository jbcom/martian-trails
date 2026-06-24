import { audio } from "@/audio/engine";
import type { Screen } from "@/core/screens";

/**
 * Audio reactor — maps game state to the audio layer in one place, so screens
 * don't each scatter audio calls. Call `onScreen` when the screen changes and
 * `onDriving` when the rover's drive state flips. Music cross-fades per context;
 * the engine hum loops only while driving; modals duck the bed.
 */

/** Music bed per screen (menu vs the trail). Modals/hazards keep the trail bed. */
function musicFor(screen: Screen): "menu" | "trail" | null {
  switch (screen) {
    case "boot":
    case "sponsor":
      return "menu";
    case "depot":
    case "travel":
    case "event":
    case "hazard":
    case "eva":
    case "outpost":
      return "trail";
    default:
      return null; // terminus/gameover: let the bed fade, leave silence for the result
  }
}

let lastScreen: Screen | null = null;

export function onScreen(screen: Screen): void {
  if (screen === lastScreen) return;
  lastScreen = screen;

  const bed = musicFor(screen);
  if (bed) audio.playMusic(bed, bed === "menu" ? 0.4 : 0.32);

  // Modal-like screens duck the bed so the moment reads; open screens restore it.
  if (screen === "event" || screen === "hazard") audio.duckMusic(0.18);
  else audio.duckMusic(0.32);

  // One-shot stings per context.
  if (screen === "travel") audio.play("airlockOpen", 0.6);
  else if (screen === "hazard") audio.play("hazardSting", 0.7);
  else if (screen === "gameover") audio.play("impactMetal", 0.7);

  // The engine hum belongs to travel only.
  if (screen !== "travel") audio.setEngineHum(false);
}

export function onDriving(driving: boolean): void {
  audio.setEngineHum(driving);
}
