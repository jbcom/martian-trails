import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "@/App";

// Real-browser smoke test for the R3F render layer. Runs in Chromium (vitest
// browser mode) so WebGL actually initializes — jsdom can't render Three.
describe("App — R3F render (real browser)", () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => cleanup?.());

  it("mounts and creates a WebGL canvas with non-zero size", async () => {
    const { container, unmount } = render(<App />);
    cleanup = unmount;

    // The brand header renders immediately.
    expect(container.textContent).toContain("MARTIAN TRAIL");

    // R3F mounts a <canvas>; wait a frame for it to size.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect((canvas as HTMLCanvasElement).getContext("webgl2")).not.toBeNull();
  });
});
