import {
  BaseCargo,
  BaseInteriorScene,
  BaseNpc,
  BaseRoverBay,
  BaseTerminal,
} from "@/render/scenes/BaseInteriorScene";

/**
 * Route outpost / "fort" stop — the same modular base system as Underhill, but
 * staged as a smaller service dock with habitat terminal, colonist, and local
 * exchange cargo instead of the full launch manifest.
 */
export function OutpostScene() {
  return (
    <BaseInteriorScene variant="outpost">
      <BaseRoverBay variant="outpost" />
      <BaseTerminal slot="habitat" />
      <BaseTerminal slot="nav" />
      <BaseNpc slot="colonist" scale={0.74} />
      <BaseNpc slot="reception" scale={0.7} />
      <BaseCargo />
    </BaseInteriorScene>
  );
}
