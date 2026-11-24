import { BASE, withBrowser } from './harness.mjs';

const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

await withBrowser(async (browser) => {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await context.newPage();
  // Offline fetches fail on purpose; their console noise is not a regression.
  let offline = false;
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (!offline && message.type() === 'error' && !message.text().includes('youtube')) {
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

  // the feed refresh button re-reads the topics and keeps the grid
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.waitForTimeout(500);
  check(
    (await page.locator('.card').count()) > 0,
    'refresh emptied the feed',
  );

  // a channel name opens that channel, unfiltered
  await page.locator('.card').first().click();
  await page.waitForURL(/\/watch\//);
  const channelHref = await page.locator('.watch__channel').getAttribute('href');
  check(Boolean(channelHref), 'watch screen has no channel link');
  await page.goto(BASE + channelHref);
  check(
    (await page.locator('.card').count()) > 0,
    'channel page showed no videos',
  );

  // community is one tab away and lists the subreddits
  await page.goto(BASE + '/community', { waitUntil: 'networkidle' });
  check(
    (await page.locator('.community__link').count()) === 8,
    'community page is missing subreddit links',
  );

  await page.goto(BASE + '/resources', { waitUntil: 'networkidle' });
  check(
    (await page.locator('.community__link').count()) === 4,
    'resources page is missing links',
  );

  await page.goto(BASE + '/history', { waitUntil: 'networkidle' });
  check(
    (await page.locator('.row').count()) > 0,
    'history did not remember the watched video',
  );

  check(
    /\d/.test(await page.locator('#countdown').innerText()),
    'exam countdown is missing',
  );

  // the bar toggle switches theme and the bar no longer links to settings
  const themeBefore = await page.locator('html').getAttribute('data-theme');
  await page.locator('#theme-toggle').click();
  check(
    (await page.locator('html').getAttribute('data-theme')) !== themeBefore,
    'bar theme toggle did not switch the theme',
  );

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

  // a deep link to a video that is not in the topic cache still plays
  const deepWatch = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const deepPage = await deepWatch.newPage();
  await deepPage.goto(BASE + '/watch/fixture-02', { waitUntil: 'networkidle' });
  await deepPage
    .waitForFunction(() => Boolean(document.querySelector('.watch__title')), null, { timeout: 5000 })
    .catch(() => {});
  check(
    (await deepPage.locator('.watch__title').count()) > 0,
    'a deep-linked video that is not in the topic cache did not load',
  );
  await deepWatch.close();

  // sorting by newest is one control away and keeps results
  await page.getByRole('link', { name: 'Newest' }).click();
  await page.waitForURL(/sort=newest/);
  check(
    (await page.locator('.row').count()) > 0,
    'newest sort emptied the results',
  );

  // home remembers what was watched and shows a daily line
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  check(
    (await page.locator('.continue .card').count()) > 0,
    'continue watching is missing after a video was opened',
  );
  check(
    (await page.locator('.feed-line').innerText()).length > 0,
    'daily line is missing',
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

  // a repeated search comes from storage instead of spending 100 quota units again
  await page.goto(BASE + '/search?q=newton', { waitUntil: 'networkidle' });
  const firstRows = await page.locator('.row').count();
  check(firstRows > 0, 'search before the reload found nothing');
  const savedKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith('serein:v1:saved:search:')),
  );
  check(savedKeys.length > 0, 'the search answer was never written to storage');
  offline = true;
  await context.setOffline(true);
  await page.goto(BASE + '/search?q=newton', { waitUntil: 'load' });
  await page.waitForSelector('.row', { timeout: 5000 }).catch(() => {});
  const repeatRows = await page.locator('.row').count();
  const reachFailed = await page.getByText(/Couldn't reach search/).count();
  check(
    repeatRows === firstRows && reachFailed === 0,
    `a repeated search went back to the API (${repeatRows} rows, failure note ${reachFailed})`,
  );
  await context.setOffline(false);
  offline = false;

  // offline: the service worker must serve the shell and the saved feed, not an error page
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const controlled = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return Boolean(navigator.serviceWorker.controller);
  });
  check(controlled, 'service worker did not take control of the page');
  offline = true;
  await context.setOffline(true);
  const shell = await page
    .goto(BASE + '/', { waitUntil: 'load' })
    .then(() => true)
    .catch(() => false);
  check(shell, 'offline navigation did not load the shell');
  await page.waitForSelector('.card', { timeout: 5000 }).catch(() => {});
  check(
    (await page.locator('.card').count()) > 0,
    'offline home lost the saved feed',
  );
  const offlineNote = await page.getByText(/You.re offline/).count();
  check(offlineNote > 0, 'offline note missing from the saved feed');
  await context.setOffline(false);
  offline = false;

  await context.close();
});

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('smoke ok');
