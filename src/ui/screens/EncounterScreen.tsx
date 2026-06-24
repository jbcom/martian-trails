import { EncounterPanel } from "@/ui/components/EncounterPanel";
import { useRun } from "@/ui/useRun";

/**
 * Encounter screen — the diegetic NPC hail overlay (M8). The R3F canvas shows the
 * EncounterScene (rover parked, NPC arrived); this screen renders the dialogue panel
 * on top. useRun drives the rAF loop (encounter is in IN_RUN_SCREENS) and routes
 * back to travel once respondEncounter clears the halt.
 */
export function EncounterScreen() {
  useRun();
  return (
    <div className="pointer-events-none flex h-full flex-col justify-end gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <EncounterPanel />
    </div>
  );
}
