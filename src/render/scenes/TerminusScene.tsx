import {
  BaseCargo,
  BaseInteriorScene,
  BaseNpc,
  BaseRoverBay,
  BaseTerminal,
} from "@/render/scenes/BaseInteriorScene";

/**
 * Korolev Crater terminus — arrival payoff inside the settlement receiving bay.
 * Reuses the slotted base shell so the finale feels like a destination in the
 * same physical language as Underhill and the route outposts.
 */
export function TerminusScene() {
  return (
    <BaseInteriorScene variant="korolev">
      <BaseRoverBay variant="korolev" />
      <BaseTerminal slot="records" />
      <BaseTerminal slot="habitat" />
      <BaseNpc slot="records" scale={0.78} />
      <BaseNpc slot="reception" scale={0.72} />
      <BaseCargo dense />
    </BaseInteriorScene>
  );
}
