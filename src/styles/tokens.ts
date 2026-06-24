/**
 * Typed mirror of the design tokens in tokens.css. Use these in TS/TSX (e.g. Three.js
 * material colors, framer-motion values) so the 3D/JS layer and the CSS layer share one
 * palette. tokens.test.ts asserts this stays in sync with tokens.css.
 */
export const colors = {
  marsBg: "#1a0b08",
  marsRed: "#8a3324",
  marsDust: "#cc7052",
  marsSand: "#e89b71",
  uiGlass: "rgba(20, 8, 6, 0.85)",
  uiBorder: "rgba(204, 112, 82, 0.35)",
  alert: "#ff5a3c",
  ok: "#44ffaa",
} as const;

export const fonts = {
  display: '"Rajdhani", system-ui, sans-serif',
  body: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const radius = {
  panel: "8px",
  control: "4px",
} as const;

export const blur = {
  glass: "10px",
} as const;

export const breakpoints = {
  tablet: "48rem",
  foldable: "75rem",
} as const;

/** Three.js wants numeric hex; expose the solid palette colors as 0x numbers too. */
export const colorsHex = {
  marsBg: 0x1a0b08,
  marsRed: 0x8a3324,
  marsDust: 0xcc7052,
  marsSand: 0xe89b71,
  alert: 0xff5a3c,
  ok: 0x44ffaa,
} as const;
