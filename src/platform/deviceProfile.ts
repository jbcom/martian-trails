import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

export type DeviceProfile = "phone" | "tablet" | "foldable";
export type DeviceOrientation = "portrait" | "landscape";

export interface DeviceProfileSnapshot {
  profile: DeviceProfile;
  orientation: DeviceOrientation;
  width: number;
  height: number;
  native: boolean;
  platform: string;
  model: string | null;
}

export function classifyDeviceProfile(width: number, height: number): DeviceProfile {
  const wide = Math.max(width, height);
  const narrow = Math.min(width, height);

  if (width >= 1200 || (wide >= 1050 && narrow >= 800)) return "foldable";
  if (width >= 768 || narrow >= 700) return "tablet";
  return "phone";
}

export function snapshotDeviceProfile(
  width: number,
  height: number,
  platform = "web",
  model: string | null = null,
): DeviceProfileSnapshot {
  return {
    profile: classifyDeviceProfile(width, height),
    orientation: width >= height ? "landscape" : "portrait",
    width,
    height,
    native: Capacitor.isNativePlatform(),
    platform,
    model,
  };
}

export async function readCapacitorDeviceProfile(
  width: number,
  height: number,
): Promise<DeviceProfileSnapshot> {
  if (!Capacitor.isNativePlatform()) {
    return snapshotDeviceProfile(width, height);
  }

  try {
    const info = await Device.getInfo();
    return snapshotDeviceProfile(width, height, info.platform, info.model);
  } catch {
    return snapshotDeviceProfile(width, height, Capacitor.getPlatform());
  }
}
