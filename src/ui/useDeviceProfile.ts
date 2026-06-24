import { useEffect, useState } from "react";
import {
  type DeviceProfileSnapshot,
  readCapacitorDeviceProfile,
  snapshotDeviceProfile,
} from "@/platform/deviceProfile";

function viewportSnapshot(): DeviceProfileSnapshot {
  if (typeof window === "undefined") return snapshotDeviceProfile(390, 844);
  return snapshotDeviceProfile(window.innerWidth, window.innerHeight);
}

export function useDeviceProfile(): DeviceProfileSnapshot {
  const [profile, setProfile] = useState<DeviceProfileSnapshot>(() => viewportSnapshot());

  useEffect(() => {
    let cancelled = false;

    function updateFromViewport() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setProfile(snapshotDeviceProfile(width, height));
      void readCapacitorDeviceProfile(width, height).then((next) => {
        if (!cancelled) setProfile(next);
      });
    }

    updateFromViewport();
    window.addEventListener("resize", updateFromViewport);
    window.addEventListener("orientationchange", updateFromViewport);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", updateFromViewport);
      window.removeEventListener("orientationchange", updateFromViewport);
    };
  }, []);

  return profile;
}
