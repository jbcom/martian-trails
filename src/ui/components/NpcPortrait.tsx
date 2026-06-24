import { useState } from "react";

/** Portrait URL for an NPC (same BASE_URL pattern as CrewPortrait). */
function npcPortraitUrl(portrait: string): string {
  return `${import.meta.env.BASE_URL}assets/generated/portraits/npc-${portrait}.png`;
}

/** NPC portrait with a compact text fallback if an authoring-time image is unavailable. */
export function NpcPortrait({
  portrait,
  name,
  size = "md",
}: {
  portrait: string;
  name: string;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-ui-border)] bg-black/40 ${
        size === "sm" ? "h-10 w-10" : "h-14 w-14"
      }`}
    >
      {failed ? (
        <span className="font-display text-[0.62rem] uppercase tracking-[0.18em] text-mars-sand/60">
          NPC
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
