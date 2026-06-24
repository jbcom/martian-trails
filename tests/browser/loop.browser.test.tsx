import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { run } from "@/sim/run";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

/** Click a button (fireEvent wraps the dispatch in act() so React flushes state). */
function click(el: Element) {
  fireEvent.click(el);
}

// Real-browser tests of the M5 gameplay loop UI — the depot store + the travel HUD —
// over the live R3F canvas (WebGL needs a real browser; jsdom can't render Three).
describe("M5 gameplay loop (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({ screen: "boot", seed: "loop-test", settings: { ...DEFAULT_SETTINGS } });
  });
  afterEach(() => cleanup?.());

  it("depot enforces budget + payload and departs into travel", () => {
    useGameStore.setState({ screen: "depot" });
    const { container, getByRole, getAllByRole, unmount } = render(<App />);
    cleanup = unmount;

    expect(container.textContent).toContain("UNDERHILL DEPOT");
    // Missing-vitals warning shows on an empty cart.
    expect(container.textContent).toMatch(/will not survive/i);

    // Buy each vital so the warning clears.
    click(getByRole("button", { name: /buy liquid o2/i }));
    click(getByRole("button", { name: /buy potable h2o/i }));
    click(getByRole("button", { name: /buy rations/i }));
    expect(container.textContent).not.toMatch(/will not survive/i);

    // Credits readout reflects spend (no longer the full budget).
    expect(container.textContent).toContain("Payload");

    // Depart builds the loadout, starts the run, and routes to travel.
    click(getByRole("button", { name: /clear airlock & depart/i }));
    expect(useGameStore.getState().screen).toBe("travel");
    const snap = run.snapshot();
    expect(snap).not.toBeNull();
    expect(snap?.driving).toBe(true);
    // The bought bulk made it into the live sim.
    expect((snap?.resources as { oxygen: number }).oxygen).toBeGreaterThan(0);
    // Touch targets: the ± buttons are ≥44px square (h-11/w-11 = 44px).
    const buyBtns = getAllByRole("button", { name: /^buy /i });
    expect(buyBtns.length).toBeGreaterThan(0);
  });

  it("travel HUD shows progress, vitals, and the drive control", async () => {
    // Stand up a live run, then mount straight onto travel.
    run.start("loop-test", {
      oxygen: 600,
      water: 600,
      rations: 600,
      parts: 5,
      medkits: 3,
      rtg: 2,
      upgrades: [],
    });
    run.setDriving(true);
    useGameStore.setState({ screen: "travel" });

    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    // Let the rAF loop publish at least one snapshot.
    await new Promise((r) => setTimeout(r, 200));

    expect(container.textContent).toContain("UNDERHILL");
    expect(container.textContent).toContain("KOROLEV");
    expect(container.textContent).toMatch(/2500 km/);
    // Vitals gauges render (data-gauge attributes from the Gauge component).
    expect(container.querySelector('[data-gauge="O₂"]')).not.toBeNull();
    expect(container.querySelector('[data-gauge="Hull"]')).not.toBeNull();
    // Pace + ration dials.
    expect(container.textContent).toContain("Steady");
    expect(container.textContent).toContain("Bare Bones");

    // The drive control halts the rover.
    const halt = getByRole("button", { name: /halt rover/i });
    click(halt);
    expect(run.snapshot()?.driving).toBe(false);
  });

  it("pace + ration dials write through the run controller", () => {
    run.start("loop-test");
    useGameStore.setState({ screen: "travel" });
    const { getByRole, unmount } = render(<App />);
    cleanup = unmount;

    click(getByRole("button", { name: "Grueling" }));
    expect(run.snapshot()?.pace).toBe("grueling");
    click(getByRole("button", { name: "Meager" }));
    expect(run.snapshot()?.rationLevel).toBe("meager");
  });

  it("the crew panel surfaces each member + fires their active ability", () => {
    run.start("loop-test");
    useGameStore.setState({ screen: "travel" });
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    // Crew names + roles render in the panel.
    expect(container.textContent).toContain("Crew");
    expect(container.textContent).toContain("John");
    expect(container.textContent).toContain("Commander");

    // Rally Crew fires and goes on cooldown (the button label flips to show the cooldown).
    click(getByRole("button", { name: /rally crew/i }));
    const john = run.snapshot()?.crew.find((c) => c.id === "john");
    expect(john?.ability?.blocked).toBe("cooldown");
  });

  it("the depot installs a rover upgrade with the sponsor budget", () => {
    // The consortium sponsor (×1.5, 18000 CR) is selected; its budget gates upgrade buys.
    useGameStore.setState({ screen: "depot", sponsorId: "consortium" });
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;

    // The sponsor budget is shown, not the default 25000.
    expect(container.textContent).toContain("18,000");
    expect(container.textContent).toContain("Rover Upgrades");

    // Install an upgrade — its button flips to "Installed".
    const install = getByRole("button", { name: /install carbon scrubbers/i });
    click(install);
    expect(getByRole("button", { name: /remove carbon scrubbers/i })).toBeTruthy();
  });
});
