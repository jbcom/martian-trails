import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { allSponsors } from "@/content/sponsors";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

// Real-browser test of the sponsor-select screen (the Oregon Trail profession choice) over
// the live R3F depot scene.
describe("Sponsor Select (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({
      screen: "sponsor",
      seed: "sp-browser",
      settings: { ...DEFAULT_SETTINGS },
    });
  });
  afterEach(() => cleanup?.());

  it("renders a charter card per sponsor with budget + multiplier", () => {
    const { container, unmount } = render(<App />);
    cleanup = unmount;
    expect(container.textContent).toContain("CHOOSE YOUR SPONSOR");
    for (const sponsor of allSponsors()) {
      expect(container.textContent).toContain(sponsor.name);
      expect(container.textContent).toContain(sponsor.budget.toLocaleString());
      expect(container.textContent).toContain(`×${sponsor.scoreMultiplier}`);
    }
  });

  it("accepting a charter locks the sponsor and routes to the depot", () => {
    const { getAllByRole, unmount } = render(<App />);
    cleanup = unmount;
    const sponsors = allSponsors();
    // Pick the second sponsor (the leaner-budget, higher-multiplier one).
    const buttons = getAllByRole("button", { name: /accept charter/i });
    fireEvent.click(buttons[1]);
    const state = useGameStore.getState();
    expect(state.sponsorId).toBe(sponsors[1].id);
    expect(state.screen).toBe("depot");
  });

  it("the chosen sponsor's budget seeds the depot credits", () => {
    const { getAllByRole, container, unmount } = render(<App />);
    cleanup = unmount;
    const sponsors = allSponsors();
    const buttons = getAllByRole("button", { name: /accept charter/i });
    // Pick the leanest sponsor and confirm the depot shows ITS budget, not the default.
    fireEvent.click(buttons[buttons.length - 1]);
    const lean = sponsors[sponsors.length - 1];
    expect(container.textContent).toContain(lean.budget.toLocaleString());
  });
});
