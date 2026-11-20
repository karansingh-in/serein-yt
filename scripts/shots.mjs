import { mkdirSync } from 'node:fs';
import { BASE, withBrowser } from './harness.mjs';

const OUT = 'docs/screens';

const sizes = [
  ['ipad-landscape', 1180, 820],
  ['ipad-portrait', 820, 1180],
  ['phone', 390, 844],
];

const screens = [
  ['home', '/'],
  ['watch', '/watch/fixture-01'],
  ['search', '/search?q=eigen'],
  ['settings', '/settings'],
];

mkdirSync(OUT, { recursive: true });

await withBrowser(async (browser) => {
  for (const [sizeName, width, height] of sizes) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height },
        colorScheme: theme,
        deviceScaleFactor: 2,
      });
      await context.addInitScript(() => {
        try {
          localStorage.setItem('serein:theme', 'auto');
        } catch {
          // ignore
        }
      });

      const page = await context.newPage();
      for (const [screenName, path] of screens) {
        await page.goto(BASE + path, { waitUntil: 'networkidle' });
        // walk the page so lazy thumbnails load before the full-page capture
        await page.evaluate(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        const file = `${OUT}/${screenName}-${sizeName}-${theme}.png`;
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
      }
      await context.close();
    }
  }
});
