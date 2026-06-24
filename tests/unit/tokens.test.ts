import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blur, breakpoints, colors, fonts, radius } from "@/styles/tokens";

// Parse the @theme block in tokens.css into a flat map of custom-property -> value.
const cssPath = resolve(process.cwd(), "src/styles/tokens.css");
const css = readFileSync(cssPath, "utf8");

function cssVars(): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].trim());
  }
  return map;
}

describe("design tokens — tokens.ts mirrors tokens.css", () => {
  const vars = cssVars();

  const colorPairs: [keyof typeof colors, string][] = [
    ["marsBg", "--color-mars-bg"],
    ["marsRed", "--color-mars-red"],
    ["marsDust", "--color-mars-dust"],
    ["marsSand", "--color-mars-sand"],
    ["uiGlass", "--color-ui-glass"],
    ["uiBorder", "--color-ui-border"],
    ["alert", "--color-alert"],
    ["ok", "--color-ok"],
  ];

  it.each(colorPairs)("color %s matches the CSS var %s", (key, cssVar) => {
    expect(vars.get(cssVar)).toBe(colors[key]);
  });

  it("fonts match", () => {
    expect(vars.get("--font-display")).toBe(fonts.display);
    expect(vars.get("--font-body")).toBe(fonts.body);
    expect(vars.get("--font-mono")).toBe(fonts.mono);
  });

  it("radius + blur + breakpoints match", () => {
    expect(vars.get("--radius-panel")).toBe(radius.panel);
    expect(vars.get("--radius-control")).toBe(radius.control);
    expect(vars.get("--blur-glass")).toBe(blur.glass);
    expect(vars.get("--breakpoint-tablet")).toBe(breakpoints.tablet);
    expect(vars.get("--breakpoint-foldable")).toBe(breakpoints.foldable);
  });

  it("every solid hex color is also exposed as a 0x number for Three.js", async () => {
    const { colorsHex } = await import("@/styles/tokens");
    expect(colorsHex.marsRed).toBe(0x8a3324);
    expect(`#${colorsHex.marsBg.toString(16).padStart(6, "0")}`).toBe(colors.marsBg);
  });
});
