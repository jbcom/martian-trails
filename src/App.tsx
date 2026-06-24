import { GameCanvas } from "@/render/GameCanvas";

/**
 * Application shell. Mounts the R3F render layer (GameCanvas — side-3D ortho
 * scene selected by the current screen) behind the MARTIAN TRAIL header. The
 * full screen router (depot/travel/hazard/eva/outpost/terminus) layers on top of
 * this; the canvas already swaps scenes by store screen. See docs/ARCHITECTURE.md.
 *
 * No placeholder geometry — every surface is a real curated PSX asset or a real
 * generated regolith texture (docs/ART-DIRECTION.md: zero procedural stand-ins).
 */
export function App() {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-mars-bg text-mars-sand">
      <GameCanvas />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="font-display text-sm tracking-[0.4em] text-mars-dust">MARTIAN TRAIL</p>
        <p className="text-xs uppercase tracking-widest text-mars-sand/70">
          Underhill Depot · UNOMA Expedition
        </p>
      </header>
    </div>
  );
}
