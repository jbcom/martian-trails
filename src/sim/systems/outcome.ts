/**
 * Win/lose evaluation (POC sol-advance terminal checks, same precedence). Sets the Outcome
 * trait's status and reason. Evaluated in the POC's order: all-crew-dead, then asphyxiation,
 * then hull failure, then arrival. Win (distance >= total) only registers if still running.
 */

import type { Entity } from "koota";
import { config } from "@/config";
import { Crew, Outcome, Position, Resources } from "../traits";
import { aliveCount } from "./helpers";

export function outcomeSystem(expedition: Entity): void {
  const outcome = expedition.get(Outcome);
  const crew = expedition.get(Crew);
  const res = expedition.get(Resources);
  const pos = expedition.get(Position);
  if (!outcome || !crew || !res || !pos) return;
  if (outcome.status !== "running") return;

  const survivors = aliveCount(crew);

  if (survivors === 0) {
    expedition.set(Outcome, { status: "lost", reason: "Expedition failed. All crew deceased." });
    return;
  }
  if (res.oxygen <= 0) {
    expedition.set(Outcome, { status: "lost", reason: "Life support failure. Asphyxiation." });
    return;
  }
  if (res.hull <= 0) {
    expedition.set(Outcome, {
      status: "lost",
      reason: "Catastrophic hull failure. Rover depressurized.",
    });
    return;
  }
  if (pos.distance >= config.travel.totalDistance) {
    expedition.set(Outcome, { status: "won", reason: "Reached Korolev Crater." });
  }
}
