import { describe, expect, it } from "vitest";
import { classifyDeviceProfile, snapshotDeviceProfile } from "@/platform/deviceProfile";

describe("device profile classification", () => {
  it("maps representative phone, tablet, and unfolded foldable viewports", () => {
    expect(classifyDeviceProfile(390, 844)).toBe("phone");
    expect(classifyDeviceProfile(1024, 768)).toBe("tablet");
    expect(classifyDeviceProfile(1280, 900)).toBe("foldable");
  });

  it("keeps the orientation with the profile snapshot", () => {
    expect(snapshotDeviceProfile(390, 844).orientation).toBe("portrait");
    expect(snapshotDeviceProfile(1024, 768).orientation).toBe("landscape");
  });
});
