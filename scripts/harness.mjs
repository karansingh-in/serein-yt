import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 4173;
export const BASE = `http://localhost:${PORT}`;

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // try the next installed browser
    }
  }
  return chromium.launch();
}

async function waitFor(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`server did not start at ${url}`);
}

/** Serves the built app, hands a browser to fn, always cleans up. */
export async function withBrowser(fn) {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
    // Screenshots and smoke tests must be deterministic and must not spend quota.
    env: { ...process.env, YT_KEY: '' },
  });
  let browser;
  try {
    await waitFor(BASE);
    browser = await launch();
    await fn(browser);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
