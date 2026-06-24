import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Node/jsdom unit tests — the pure src/sim systems, config loaders, scoring,
// RNG determinism. Browser component tests use vitest.browser.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/browser/**", "tests/e2e/**", "node_modules", "dist", "android"],
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
