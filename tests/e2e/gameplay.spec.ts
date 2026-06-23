import { expect, test } from "@playwright/test";

test.describe("Martian Trail E2E Critical Path", () => {
  test("should load and allow launching expedition successfully", async ({ page }) => {
    // Open the local dev game server
    await page.goto("/");

    // Validate high-tech typography logo load
    await expect(page.locator("h1")).toContainText("UNDERHILL DEPOT");

    // Confirm Rover payload starts empty
    await expect(page.locator(".payload-labels span").last()).toContainText("0 / 1000 kg");

    // Purchase necessary vitals supplies
    // Liquid O2 buy button is the 2nd button in the first store-item (the + button)
    const storeItems = page.locator(".store-item");
    await expect(storeItems).toHaveCount(6);

    // Liquid O2 is storeItems.first()
    const o2Item = storeItems.first();
    const plusBtn = o2Item.locator(".store-btn").last();

    await plusBtn.click();
    await expect(o2Item.locator(".store-qty")).toContainText("50");

    // Launch the expedition
    const launchBtn = page.locator(".launch-btn");
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // Confirm transitioning state page to Travel HUD layers
    const crewTitle = page.locator("h2").first();
    await expect(crewTitle).toContainText("ARES CREW");

    // Validate interactive control driving button and toggle states
    const driveBtn = page.locator(".dashboard-controls button").first();
    await expect(driveBtn).toHaveText("Driving");

    // Halt driving
    await driveBtn.click();
    await expect(driveBtn).toHaveText("Halted");
  });
});
