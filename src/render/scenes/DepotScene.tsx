import {
  BaseCargo,
  BaseInteriorScene,
  BaseNpc,
  BaseRoverBay,
  BaseTerminal,
} from "@/render/scenes/BaseInteriorScene";

/**
 * Underhill Depot — an enclosed modular garage built from the 3DPSX base kit.
 * The depot UI points at the same diegetic slots rendered here: manifest
 * terminal, NPC briefers, cargo racks, and the departure airlock.
 */
export function DepotScene() {
  return (
    <BaseInteriorScene variant="underhill">
      <BaseRoverBay variant="underhill" />
      <BaseTerminal slot="manifest" />
      <BaseTerminal slot="nav" />
      <BaseNpc slot="quartermaster" />
      <BaseNpc slot="colonist" scale={0.72} />
      <BaseNpc slot="navigator" scale={0.76} />
      <BaseCargo dense />
    </BaseInteriorScene>
  );
}
