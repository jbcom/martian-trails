import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the audio engine so the reactor's state→audio mapping is testable headless
// (howler needs a real AudioContext).
const calls: string[] = [];
vi.mock("@/audio/engine", () => ({
  audio: {
    playMusic: (id: string) => calls.push(`music:${id}`),
    duckMusic: (to: number) => calls.push(`duck:${to}`),
    play: (id: string) => calls.push(`sfx:${id}`),
    setEngineHum: (on: boolean) => calls.push(`hum:${on}`),
  },
}));

const { onScreen, onDriving } = await import("@/audio/reactor");

describe("audio reactor — game state → audio", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("plays the menu bed on boot/sponsor and the trail bed in-run", () => {
    onScreen("travel"); // force a screen change from the module's last state
    calls.length = 0;
    onScreen("boot");
    expect(calls).toContain("music:menu");
    calls.length = 0;
    onScreen("depot");
    expect(calls).toContain("music:trail");
  });

  it("ducks the bed on event/hazard modals", () => {
    onScreen("travel");
    calls.length = 0;
    onScreen("event");
    expect(calls.some((c) => c.startsWith("duck:0.18"))).toBe(true);
  });

  it("plays a hazard sting entering the hazard screen", () => {
    onScreen("travel");
    calls.length = 0;
    onScreen("hazard");
    expect(calls).toContain("sfx:hazardSting");
  });

  it("swaps to context music beds: hazard→tension, eva→ambient, terminus→victory", () => {
    onScreen("travel");
    calls.length = 0;
    onScreen("hazard");
    expect(calls).toContain("music:tension");

    onScreen("travel");
    calls.length = 0;
    onScreen("eva");
    expect(calls).toContain("music:ambient");

    onScreen("travel");
    calls.length = 0;
    onScreen("terminus");
    expect(calls).toContain("music:victory");
  });

  it("ignores a no-op same-screen call", () => {
    onScreen("outpost");
    calls.length = 0;
    onScreen("outpost");
    expect(calls).toEqual([]);
  });

  it("drives the engine hum off the driving flag", () => {
    calls.length = 0;
    onDriving(true);
    expect(calls).toContain("hum:true");
    onDriving(false);
    expect(calls).toContain("hum:false");
  });
});
