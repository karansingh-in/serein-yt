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

  await page.getByRole('link', { name: 'Statistics' }).click();
  await page.waitForURL(/topic=statistics/);
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

  await page.goBack();
  await page.waitForURL(/topic=statistics/);
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

  await page.goto(BASE + '/search?q=matrix', { waitUntil: 'networkidle' });
  check((await page.locator('.row').count()) > 0, 'search found no local results for "matrix"');

  await page.goto(BASE + '/search?q=zzzz', { waitUntil: 'networkidle' });
  const empty = await page.locator('.empty').innerText();
  check(empty.includes('Nothing found'), `empty search state missing: ${empty}`);

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
