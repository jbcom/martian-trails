import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

describe("game store (UI cadence)", () => {
  beforeEach(() => {
    useGameStore.setState({ screen: "boot", seed: null, settings: { ...DEFAULT_SETTINGS } });
  });

  it("boots on the boot screen with no seed", () => {
    const s = useGameStore.getState();
    expect(s.screen).toBe("boot");
    expect(s.seed).toBeNull();
  });

  it("goTo switches screens", () => {
    useGameStore.getState().goTo("depot");
    expect(useGameStore.getState().screen).toBe("depot");
  });

  it("startRun stores the seed and moves to sponsor select", () => {
    useGameStore.getState().startRun("ares-7");
    const s = useGameStore.getState();
    expect(s.seed).toBe("ares-7");
    expect(s.screen).toBe("sponsor");
  });

  it("chooseSponsor locks in the sponsor and moves to the depot", () => {
    useGameStore.getState().chooseSponsor("consortium");
    const s = useGameStore.getState();
    expect(s.sponsorId).toBe("consortium");
    expect(s.screen).toBe("depot");
  });

  it("setSetting updates a single setting immutably", () => {
    useGameStore.getState().setSetting("muted", true);
    expect(useGameStore.getState().settings.muted).toBe(true);
    expect(useGameStore.getState().settings.haptics).toBe(DEFAULT_SETTINGS.haptics);
  });
});
