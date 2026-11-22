import { BASE, withBrowser } from './harness.mjs';

const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

await withBrowser(async (browser) => {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('youtube')) {
      problems.push(`console: ${message.text()}`);
    }
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const total = await page.locator('.card').count();
  check(total > 0, `home rendered no cards (${total})`);

  await page.getByRole('link', { name: 'Zoology' }).click();
  await page.waitForURL(/topic=zoology/);
  const filtered = await page.locator('.card').count();
  check(filtered === 3, `topic tab showed ${filtered} cards, expected 3`);

  const title = await page.locator('.card__title').first().innerText();
  await page.locator('.card').first().click();
  await page.waitForURL(/\/watch\//);
  const frame = await page.locator('.stage iframe').getAttribute('src');
  check(
    Boolean(frame?.includes('youtube-nocookie.com/embed/')),
    `watch iframe src looks wrong: ${frame}`,
  );
  const heading = await page.locator('.watch__title').innerText();
  check(heading === title, 'watch heading does not match the card title');

  // maximize fills the window without covering the player, Escape restores the page
  const before = await page.locator('.stage').boundingBox();
  await page.getByRole('button', { name: 'Maximize' }).click();
  check(
    (await page.locator('.watch.is-max').count()) === 1,
    'maximize did not expand the player',
  );
  check(
    (await page.locator('.watch__title').isVisible()) === false,
    'maximize left the page text visible',
  );
  const after = await page.locator('.stage').boundingBox();
  check(
    Boolean(before && after && after.width > before.width),
    `maximized stage did not grow (${before?.width} -> ${after?.width})`,
  );
  await page.keyboard.press('Escape');
  check(
    (await page.locator('.watch.is-max').count()) === 0,
    'Escape did not leave the maximized player',
  );

  await page.goBack();
  await page.waitForURL(/topic=zoology/);
  const seen = await page.locator('.card.is-seen').count();
  check(seen > 0, 'opened video was not dimmed in the feed');

  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Dark' }).click();
  check(
    (await page.locator('html').getAttribute('data-theme')) === 'dark',
    'theme button did not switch to dark',
  );
  await page.reload({ waitUntil: 'networkidle' });
  check(
    (await page.locator('html').getAttribute('data-theme')) === 'dark',
    'theme did not survive a reload',
  );

  await page.goto(BASE + '/search?q=photosynthesis', { waitUntil: 'networkidle' });
  check(
    (await page.locator('.row').count()) > 0,
    'search found no results for "photosynthesis"',
  );

  // a cold visit straight to /search must query the API itself, not rely on the home feed
  const coldSearch = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const deep = await coldSearch.newPage();
  await deep.goto(BASE + '/search?q=photosynthesis', { waitUntil: 'networkidle' });
  await deep
    .waitForFunction(() => document.querySelectorAll('.row').length > 0, null, { timeout: 5000 })
    .catch(() => {});
  check(
    (await deep.locator('.row').count()) > 0,
    'cold /search found no results for "photosynthesis"',
  );
  await coldSearch.close();

  await page.goto(BASE + '/search?q=zzzz', { waitUntil: 'networkidle' });
  const empty = await page.locator('.empty').innerText();
  check(empty.includes('No results'), `empty search state missing: ${empty}`);

  // the API failing on a cold start must produce the error state, not a blank page
  const cold = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const failing = await cold.newPage();
  await failing.route('**/api/videos**', (route) => route.fulfill({ status: 502, body: '{}' }));
  await failing.goto(BASE + '/', { waitUntil: 'networkidle' });
  const failure = await failing.locator('.empty').innerText();
  check(
    failure.includes("Couldn't load your topics"),
    `error state missing when the API fails: ${failure}`,
  );
  await cold.close();

  await context.close();
});

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('smoke ok');
