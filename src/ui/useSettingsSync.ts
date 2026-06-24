import { useEffect } from "react";
import { audio } from "@/audio/engine";
import { setHapticsEnabled } from "@/platform/haptics";
import { useGameStore } from "@/state/store";

/**
 * Pushes the human-cadence settings into the side-effecting subsystems that own them: the audio
 * engine's master mute and the haptics gate. `settings.reducedMotion` is consumed directly by
 * useReducedMotion at the render/transition sites, so it needs no push here. Mount once at the
 * app shell so the wiring follows the store wherever the player toggles a setting.
 */
export function useSettingsSync(): void {
  const muted = useGameStore((s) => s.settings.muted);
  const haptics = useGameStore((s) => s.settings.haptics);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    setHapticsEnabled(haptics);
  }, [haptics]);
}
