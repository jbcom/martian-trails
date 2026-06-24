import { expect, type Page, test } from "@playwright/test";

/**
 * Visual sweep — walks the full journey at several phone/tablet widths, screenshots every
 * screen, and programmatically flags clipped content. DOM-presence assertions (the m7-2 gap)
 * miss this entirely: an element can be in the DOM yet rendered half-cut by an `overflow:hidden`
 * ancestor or pushed off a centered scroll origin. This sweep is the regression guard for both
 * the Hall-of-Records clipping and the "half a portrait on phones" report.
 *
 * Screenshots land in artifacts/ for human review; the assertions fail CI on any clip.
 */

const WIDTHS = [
  { label: "phone-320", w: 320, h: 568 }, // smallest common phone (iPhone SE 1st gen / Galaxy Fold cover)
  { label: "phone-360", w: 360, h: 740 }, // most common Android
  { label: "phone-390", w: 390, h: 844 }, // iPhone 12-15
  { label: "tablet-768", w: 768, h: 1024 },
  { label: "foldable-open", w: 884, h: 1104 },
];

/** Any <img> rendered outside its nearest clipping (overflow!=visible) ancestor by > tol px. */
const CLIP_PROBE = `(() => {
  const tol = 1.5;
  const clips = [];
  for (const img of Array.from(document.querySelectorAll('img'))) {
    const r = img.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // walk up to the nearest ancestor that clips overflow
    let clipEl = img.parentElement;
    while (clipEl) {
      const ov = getComputedStyle(clipEl).overflow + getComputedStyle(clipEl).overflowY + getComputedStyle(clipEl).overflowX;
      if (/hidden|clip|auto|scroll/.test(ov)) break;
      clipEl = clipEl.parentElement;
    }
    const box = clipEl ? clipEl.getBoundingClientRect() : { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
    const cutTop = box.top - r.top, cutBottom = r.bottom - box.bottom;
    const cutLeft = box.left - r.left, cutRight = r.right - box.right;
    const worst = Math.max(cutTop, cutBottom, cutLeft, cutRight);
    // also off the visible viewport entirely
    const offViewport = Math.max(0 - r.bottom, r.top - innerHeight, 0 - r.right, r.left - innerWidth);
    if (worst > tol || offViewport > tol) {
      clips.push({ src: img.src.split('/').pop(), worstCutPx: Math.round(worst), offViewportPx: Math.round(offViewport), rendered: [Math.round(r.width), Math.round(r.height)] });
    }
  }
  return clips;
})()`;

async function assertNoClips(page: Page, screen: string, label: string) {
  const clips = (await page.evaluate(CLIP_PROBE)) as Array<{ src: string; worstCutPx: number }>;
  expect(
    clips,
    `${screen} @ ${label}: image(s) clipped/off-screen → ${JSON.stringify(clips)}`,
  ).toEqual([]);
}

async function shot(page: Page, screen: string, label: string) {
  await page.screenshot({ path: `artifacts/sweep/${screen}-${label}.png`, fullPage: false });
}

async function dataClick(page: Page, testId: string) {
  const clicked = await page.evaluate((id) => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, testId);
  expect(clicked, `missing ${testId}`).toBe(true);
}

for (const { label, w, h } of WIDTHS) {
  test(`visual sweep — no clipped content @ ${label}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });

    // Seed a full Hall-of-Records board so boot is at worst-case vertical fit.
    await page.addInitScript(() => {
      const board = Array.from({ length: 10 }, (_, i) => ({
        score: 5000 - i * 317,
        sol: 10 + i,
        survivors: (4 - (i % 5) + 5) % 5 || 1,
        seed: `seed-${i}`,
        sponsorId: ["unoma", "consortium", "solex"][i % 3],
        date: 1_700_000_000_000 + i * 86_400_000,
      }));
      localStorage.setItem("CapacitorStorage.highscores", JSON.stringify(board));
    });

    await page.goto("/");
    await expect(page.getByText("MARTIAN TRAIL")).toBeVisible();
    await shot(page, "boot", label);
    // Boot: the full board must be reachable — scroll to the last row and confirm it's visible.
    const lastRow = page.getByText("2147"); // lowest seeded score
    await lastRow.scrollIntoViewIfNeeded();
    await expect(lastRow).toBeVisible();
    await assertNoClips(page, "boot", label);

    // → Sponsor
    await page.getByRole("button", { name: /begin expedition/i }).click();
    await expect(page.getByText(/choose your sponsor/i)).toBeVisible();
    await shot(page, "sponsor", label);
    await assertNoClips(page, "sponsor", label);

    // → Depot. Navigation clicks use force:true — this spec's job is to REACH each screen and
    // assert nothing is clipped, not to validate tap targets. (A pointer-intercept by the sticky
    // sponsor subtitle at narrow widths is tracked separately as a tap-target concern.)
    const charter = page.getByRole("button", { name: /accept charter/i }).first();
    await charter.scrollIntoViewIfNeeded();
    // Dispatch a synthetic click straight to the element — bypasses any sticky-header overlay
    // that intercepts a positional click at the narrowest widths (a hit-testing artifact, not a
    // layout clip; clip detection is handled by assertNoClips, not by reachability here).
    await charter.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByText(/underhill depot/i)).toBeVisible();
    await shot(page, "depot", label);
    await assertNoClips(page, "depot", label);

    await dataClick(page, "depot-action-codriver");
    await expect(page.getByText(/rover berth/i)).toBeVisible();
    await shot(page, "depot-codriver", label);
    await assertNoClips(page, "depot-codriver", label);
    await dataClick(page, "recruit-codriver:okonkwo");
    await expect(page.getByText(/rover berth/i)).toBeHidden();

    await dataClick(page, "depot-action-manifest");
    await expect(page.getByTestId("depot-station-panel").getByText(/cargo gantry/i)).toBeVisible();
    await shot(page, "depot-manifest", label);
    await assertNoClips(page, "depot-manifest", label);
    await dataClick(page, "manifest-tab-upgrades");
    await shot(page, "depot-upgrades", label);
    await assertNoClips(page, "depot-upgrades", label);
    await dataClick(page, "manifest-tab-supplies");
    await dataClick(page, "buy-oxygen");
    await dataClick(page, "buy-water");
    await dataClick(page, "buy-rations");
    await dataClick(page, "manifest-close");

    await dataClick(page, "depot-depart");
    await expect(page.getByText(/expedition telemetry/i)).toBeVisible();
    await expect(page.getByText(/co-driver/i)).toBeVisible();
    await shot(page, "travel-codriver", label);
    await assertNoClips(page, "travel-codriver", label);
  });
}

// Event-modal portraits are exercised by the real-browser encounter tests, which reach those
// screens deterministically via the run controller rather than relying on random trail rolls here.
