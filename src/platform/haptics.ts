import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Haptics bridge — settings-gated, no-op on web (where Capacitor isn't native).
 * UI calls these for tactile feedback; they never throw if haptics are
 * unavailable.
 */
let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

const isNative = () => Capacitor.isNativePlatform();

export async function tapLight(): Promise<void> {
  if (!enabled || !isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable — ignore */
  }
}

export async function tapHeavy(): Promise<void> {
  if (!enabled || !isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    /* ignore */
  }
}

export async function notifyError(): Promise<void> {
  if (!enabled || !isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    /* ignore */
  }
}
