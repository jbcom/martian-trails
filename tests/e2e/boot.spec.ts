import { expect, test } from "@playwright/test";

// Boot smoke test for the current R3F shell. The full-journey e2e
// (depot → trail → hazard → eva → outpost → terminus) is written in Milestone 5
// as those screens land.
test.describe("Martian Trail — boot", () => {
  test("boots, brands, and renders the 3D canvas", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Martian Trail");
    await expect(page.getByText("MARTIAN TRAIL")).toBeVisible();

    // R3F mounts a WebGL canvas with non-zero dimensions.
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(box?.height ?? 0).toBeGreaterThan(0);
  });
});
