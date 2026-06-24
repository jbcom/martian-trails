import { OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { cleanup as cleanupDom, render, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import type { OrthographicCamera as ThreeOrthoCamera } from "three";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { commands, page } from "vitest/browser";
import { zoomForWidth } from "@/render/camera";
import type { BaseInteriorVariant } from "@/render/scenes/BaseInteriorScene";
import {
  BaseCargo,
  BaseInteriorScene,
  BaseNpc,
  BaseRoverBay,
  BaseTerminal,
} from "@/render/scenes/BaseInteriorScene";
import { colors } from "@/styles/tokens";

type Vec3 = [number, number, number];
type PixelRead = { pixels: Uint8Array; width: number; height: number };

declare const __WORKSPACE_ROOT__: string;

const variantCases: BaseInteriorVariant[] = ["underhill", "outpost", "korolev"];
const perspectives = [
  { label: "front", position: [5, 4.8, 18] as Vec3, target: [0, 1.8, 0] as Vec3, zoom: 1 },
  {
    label: "left-rake",
    position: [-8, 5.4, 16] as Vec3,
    target: [-0.8, 1.9, 0] as Vec3,
    zoom: 0.92,
  },
] as const;
const profiles = [
  { label: "phone", w: 390, h: 844 },
  { label: "tablet", w: 1024, h: 768 },
  { label: "foldable", w: 1280, h: 900 },
] as const;

function TestCamera({
  position,
  target,
  zoomScale,
}: {
  position: Vec3;
  target: Vec3;
  zoomScale: number;
}) {
  const ref = useRef<ThreeOrthoCamera>(null);
  const zoom = zoomForWidth(window.innerWidth) * zoomScale;

  useEffect(() => {
    ref.current?.lookAt(target[0], target[1], target[2]);
    if (ref.current) {
      ref.current.zoom = zoom;
      ref.current.updateProjectionMatrix();
    }
  }, [target, zoom]);

  return (
    <OrthographicCamera
      ref={ref}
      makeDefault
      position={position}
      zoom={zoom}
      near={-100}
      far={200}
    />
  );
}

function SlottedVariant({ variant }: { variant: BaseInteriorVariant }) {
  if (variant === "outpost") {
    return (
      <>
        <BaseRoverBay variant="outpost" />
        <BaseTerminal slot="habitat" />
        <BaseTerminal slot="nav" />
        <BaseNpc slot="colonist" scale={0.74} />
        <BaseNpc slot="reception" scale={0.7} />
        <BaseCargo />
      </>
    );
  }

  if (variant === "korolev") {
    return (
      <>
        <BaseRoverBay variant="korolev" />
        <BaseTerminal slot="records" />
        <BaseTerminal slot="habitat" />
        <BaseNpc slot="records" scale={0.78} />
        <BaseNpc slot="reception" scale={0.72} />
        <BaseCargo dense />
      </>
    );
  }

  return (
    <>
      <BaseRoverBay variant="underhill" />
      <BaseTerminal slot="manifest" />
      <BaseTerminal slot="nav" />
      <BaseNpc slot="quartermaster" />
      <BaseNpc slot="colonist" scale={0.72} />
      <BaseNpc slot="navigator" scale={0.76} />
      <BaseCargo dense />
    </>
  );
}

function FrameProbe() {
  const frames = useRef(0);

  useFrame(({ gl }) => {
    frames.current += 1;
    if (frames.current >= 8) gl.domElement.dataset.sceneReady = "true";
  });

  return null;
}

function BaseHarness({
  variant,
  perspective,
}: {
  variant: BaseInteriorVariant;
  perspective: (typeof perspectives)[number];
}) {
  return (
    <div style={{ height: "100dvh", width: "100vw" }}>
      <Canvas
        dpr={1}
        gl={{ antialias: false, preserveDrawingBuffer: true }}
        shadows="basic"
        style={{ background: colors.marsBg }}
      >
        <color attach="background" args={[colors.marsBg]} />
        <TestCamera
          position={perspective.position}
          target={perspective.target}
          zoomScale={perspective.zoom}
        />
        <BaseInteriorScene variant={variant}>
          <SlottedVariant variant={variant} />
        </BaseInteriorScene>
        <FrameProbe />
      </Canvas>
    </div>
  );
}

function statsFromPixels({ pixels, width, height }: PixelRead) {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 120));
  let samples = 0;
  let visible = 0;
  let bright = 0;
  let veryDarkEdge = 0;
  let edgeSamples = 0;
  const edge = Math.floor(Math.min(width, height) * 0.08);

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = pixels[i] ?? 0;
      const g = pixels[i + 1] ?? 0;
      const b = pixels[i + 2] ?? 0;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const onEdge = x < edge || x > width - edge || y < edge || y > height - edge;
      samples += 1;
      if (r + g + b > 12) visible += 1;
      if (lum > 24) bright += 1;
      if (onEdge) {
        edgeSamples += 1;
        if (r + g + b < 12) veryDarkEdge += 1;
      }
    }
  }

  return {
    brightRatio: bright / samples,
    visibleRatio: visible / samples,
    veryDarkEdgeRatio: edgeSamples > 0 ? veryDarkEdge / edgeSamples : 1,
  };
}

function readCanvasPixels(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!gl) throw new Error("No WebGL context");

  const { width, height } = canvas;
  const pixels = new Uint8Array(width * height * 4);
  gl.finish();
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return { pixels, width, height };
}

function canvasPngFromPixels({ pixels, width, height }: PixelRead): string {
  const flipped = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y += 1) {
    const src = y * width * 4;
    const dst = (height - y - 1) * width * 4;
    flipped.set(pixels.subarray(src, src + width * 4), dst);
    for (let x = 0; x < width; x += 1) {
      flipped[dst + x * 4 + 3] = 255;
    }
  }

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("No 2D context for PNG capture");
  ctx.putImageData(new ImageData(flipped, width, height), 0, 0);
  return out.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

async function waitForScenePixels(canvas: HTMLCanvasElement): Promise<PixelRead> {
  let latest: PixelRead | null = null;
  await waitFor(
    () => {
      expect(canvas.dataset.sceneReady).toBe("true");
      latest = readCanvasPixels(canvas);
      const stats = statsFromPixels(latest);
      expect(stats.visibleRatio).toBeGreaterThan(0.8);
      expect(stats.brightRatio).toBeGreaterThan(0.002);
      expect(stats.veryDarkEdgeRatio).toBeLessThan(0.1);
    },
    { timeout: 15_000 },
  );
  if (!latest) throw new Error("No base-scene pixels captured");
  return latest;
}

async function writeCanvasPng(read: PixelRead, name: string) {
  const encoded = canvasPngFromPixels(read);
  expect(encoded.length, `${name} png bytes`).toBeGreaterThan(1000);
  await commands.writeFile(
    `${__WORKSPACE_ROOT__}/artifacts/base-interior/${name}.png`,
    encoded,
    "base64",
  );
}

describe("BaseInteriorScene isolated visual matrix (real browser)", () => {
  afterEach(() => cleanupDom());
  afterAll(async () => {
    cleanupDom();
    await page.viewport(1024, 768);
  });

  it("captures depot, outpost, and terminus slots from multiple camera perspectives", async () => {
    await page.viewport(884, 720);

    for (const variant of variantCases) {
      for (const perspective of perspectives) {
        cleanupDom();
        const { container } = render(<BaseHarness variant={variant} perspective={perspective} />);
        const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
        expect(canvas, `${variant}:${perspective.label} canvas`).not.toBeNull();
        const read = await waitForScenePixels(canvas as HTMLCanvasElement);
        await writeCanvasPng(read, `${variant}-${perspective.label}`);
      }
    }
  }, 120_000);

  it("captures Underhill across phone, tablet, and unfolded foldable profiles", async () => {
    for (const profile of profiles) {
      await page.viewport(profile.w, profile.h);
      cleanupDom();
      const { container } = render(
        <BaseHarness variant="underhill" perspective={perspectives[0]} />,
      );
      const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
      expect(canvas, `underhill:${profile.label} canvas`).not.toBeNull();
      const read = await waitForScenePixels(canvas as HTMLCanvasElement);
      await writeCanvasPng(read, `underhill-${profile.label}`);
    }
  }, 90_000);
});
