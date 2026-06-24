import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { DEFAULT_SETTINGS, useGameStore } from "@/state/store";

// Real-browser test of the DOM screen router over the R3F canvas.
describe("screen router (real browser)", () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    useGameStore.setState({ screen: "boot", seed: null, settings: { ...DEFAULT_SETTINGS } });
  });
  afterEach(() => cleanup?.());

  it("boots to the title screen with a begin button", () => {
    const { container, getByRole, unmount } = render(<App />);
    cleanup = unmount;
    expect(container.textContent).toContain("MARTIAN TRAIL");
    expect(getByRole("button", { name: /begin expedition/i })).toBeTruthy();
  });

  it("begin advances the screen and seeds a run", () => {
    const { getByRole, unmount } = render(<App />);
    cleanup = unmount;
    getByRole("button", { name: /begin expedition/i }).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    const state = useGameStore.getState();
    expect(state.seed).not.toBeNull();
    expect(state.screen).toBe("depot");
  });

  it("renders the depot panel on the depot screen", () => {
    useGameStore.setState({ screen: "depot" });
    const { container, unmount } = render(<App />);
    cleanup = unmount;
    expect(container.textContent).toContain("UNDERHILL DEPOT");
  });
});
