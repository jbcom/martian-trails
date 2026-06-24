import { useState } from "react";
import { getNpc } from "@/content/encounters";
import { tapLight } from "@/platform/haptics";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";
import { useRun } from "@/ui/useRun";

/** Portrait URL for an NPC (same BASE_URL pattern as CrewPortrait). */
function npcPortraitUrl(portrait: string): string {
  return `${import.meta.env.BASE_URL}assets/generated/portraits/npc-${portrait}.png`;
}

/** NPC portrait with silhouette fallback — mirrors CrewPortrait in TravelScreen. */
function NpcPortrait({ portrait, name }: { portrait: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-ui-border)] bg-black/40">
      {failed ? (
        <span className="font-display text-xl text-mars-sand/60" aria-hidden>
          ◓
        </span>
      ) : (
        <img
          src={npcPortraitUrl(portrait)}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/**
 * The encounter dialogue panel — surfaces the NPC's hail lines and the player's
 * response choices. Reads pendingEncounter from the live run snapshot; calls
 * run.respondEncounter on choice and routes back to travel on completion.
 * Framer-motion enter via GlassPanel motionProps (consistent with other panels).
 */
export function EncounterPanel() {
  const snap = useRun();
  const goTo = useGameStore((s) => s.goTo);
  const pending = snap?.pendingEncounter ?? null;

  if (!pending) return null;

  const npc = getNpc(pending.npcId);
  const node = pending.resolved.node;

  function choose(choiceId: string) {
    void tapLight();
    run.respondEncounter(choiceId);
    run.setDriving(true);
    goTo("travel");
  }

  return (
    <GlassPanel
      className="pointer-events-auto flex flex-col gap-3 p-4"
      motionProps={{
        initial: { y: 24, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 24, opacity: 0 },
      }}
    >
      {/* NPC header: portrait + name + archetype label. */}
      <div className="flex items-center gap-3">
        {npc && <NpcPortrait portrait={npc.portrait ?? npc.id} name={npc.name} />}
        <div>
          <p className="font-display text-sm text-mars-sand">{npc?.name ?? pending.npcId}</p>
          <p className="font-mono text-xs uppercase tracking-widest text-mars-dust/70">
            {npc?.archetype ?? "unknown"}
          </p>
        </div>
      </div>

      {/* NPC dialogue lines. */}
      <div className="flex flex-col gap-1">
        {node.lines.map((line) => (
          <p
            key={`${pending.resolved.nodeKey}:${line}`}
            className="font-display text-sm leading-snug text-mars-sand/90"
          >
            {line}
          </p>
        ))}
      </div>

      {/* Choice buttons — one per node choice, or a single "Acknowledge" if none. */}
      <div className="flex flex-col gap-2">
        {node.choices.length > 0 ? (
          node.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => choose(choice.id)}
              className="pointer-events-auto w-full rounded border border-[var(--color-ui-border)] bg-black/30 px-3 py-2 text-left font-display text-sm text-mars-sand transition-colors hover:bg-mars-rust/20 active:bg-mars-rust/30"
            >
              {choice.text}
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={() => choose("acknowledge")}
            className="pointer-events-auto w-full rounded border border-[var(--color-ui-border)] bg-black/30 px-3 py-2 text-left font-display text-sm text-mars-sand transition-colors hover:bg-mars-rust/20 active:bg-mars-rust/30"
          >
            Understood. Safe travels.
          </button>
        )}
      </div>
    </GlassPanel>
  );
}
