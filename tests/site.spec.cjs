const { test, expect } = require("@playwright/test");

const viewports = [390, 768, 1024, 1440];
const visualRoutes = [
  "/2017/10/11/a-case-for-bigger-pockets.html",
  "/2017/12/01/weinbergisms.html",
  "/2026/05/31/the-fault-in-our-star-clustering.html",
];

test("ordinary pages ship no visualization JavaScript", async ({ page }) => {
  await page.addInitScript(() => {
    window.__siteCls = 0;
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) if (!entry.hadRecentInput) window.__siteCls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.waitForTimeout(150);
  await expect(page.locator('script[src^="/assets/js/"]')).toHaveCount(0);
  await expect(page.locator('link[href="/assets/main.css"]')).toHaveAttribute("rel", "stylesheet");
  expect(await page.evaluate(() => window.__siteCls)).toBeLessThanOrEqual(0.001);
});

test("constellation ships one route script", async ({ page }) => {
  await page.goto("/2026/05/31/the-fault-in-our-star-clustering.html");
  await expect(page.locator('script[src^="/assets/js/"]')).toHaveCount(1);
  await expect(page.locator('script[src="/assets/js/constellation.js"]')).toHaveCount(1);
});

test("constellation remains usable in dark mode and reduced motion", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/2026/05/31/the-fault-in-our-star-clustering.html");
  const mount = page.locator('[data-viz-reserve="star-naive"]');
  await mount.scrollIntoViewIfNeeded();
  await expect(mount).toHaveAttribute("data-viz-ready", "true");
  await expect(mount.locator("canvas")).toHaveCount(1);
  await expect(mount.locator('canvas[role="img"]')).toBeVisible();
});

for (const width of viewports) {
  test(`visualization reserves survive hydration at ${width}px`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__siteCls = 0;
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) if (!entry.hadRecentInput) window.__siteCls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.setViewportSize({ width, height: 900 });
    for (const route of visualRoutes) {
      await page.goto(route);
      const mounts = page.locator("[data-viz-reserve]");
      const count = await mounts.count();
      for (let index = 0; index < count; index += 1) {
        const mount = mounts.nth(index);
        await mount.scrollIntoViewIfNeeded();
        await expect(mount).toHaveAttribute("data-viz-ready", "true");
        const geometry = await mount.evaluate((node) => {
          const reserve = parseFloat(getComputedStyle(node).getPropertyValue("--viz-reserve-block"));
          return { height: node.getBoundingClientRect().height, reserve };
        });
        expect(Math.abs(geometry.height - geometry.reserve), `${route} ${width}px ${index}`).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => window.__siteCls), `${route} ${width}px CLS`).toBeLessThanOrEqual(0.001);
    }
  });
}
