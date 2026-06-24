import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Real-browser component tests (Chromium via Playwright). Drives the React UI
// through the store and asserts rendered DOM — not raw pixels. Headless is
// CI-driven; locally set VITEST_BROWSER_HEADLESS=false to watch.
const headless = process.env.VITEST_BROWSER_HEADLESS === "false" ? false : !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/browser/**/*.{test,spec}.{ts,tsx}"],
    fileParallelism: false,
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          args: [
            "--enable-gpu",
            "--ignore-gpu-blocklist",
            "--use-gl=angle",
            "--use-angle=swiftshader-webgl",
          ],
        },
      }),
      instances: [{ browser: "chromium" }],
      headless,
      screenshotFailures: true,
    },
  },
});
