import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './videos';

function fakeResponse() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(key: string, value: string) {
      res.headers[key.toLowerCase()] = value;
    },
    end(body: string) {
      res.body = body;
    },
  };
  return res;
}

const request = (query: Record<string, string>) => ({ method: 'GET', query });

const snippet = (title: string, channel = 'Physics Wallah') => ({
  title,
  channelTitle: channel,
  publishedAt: '2026-11-18T00:00:00Z',
  description: 'A lecture.',
  liveBroadcastContent: 'none',
  thumbnails: { high: { url: 'https://i.ytimg.com/vi/x/hq.jpg' } },
});

const search = {
  items: [
    { id: { videoId: 'keep' }, snippet: snippet("Physics lecture one: Newton's laws") },
    { id: { videoId: 'short' }, snippet: snippet('Physics in 45 seconds') },
    { id: { videoId: 'offtopic' }, snippet: snippet('Cooking pasta at home') },
    { id: { videoId: 'unembeddable' }, snippet: snippet('Physics matrix tricks') },
    { id: { videoId: 'wrongchannel' }, snippet: snippet('Physics lecture from elsewhere', 'Some Other Channel') },
  ],
};

const details = {
  items: [
    {
      id: 'keep',
      contentDetails: { duration: 'PT20M' },
      status: { embeddable: true, uploadStatus: 'processed' },
      snippet: { title: "Physics lecture one: Newton's laws", description: 'The full description, which is much longer than the truncated one.' },
    },
    {
      id: 'short',
      contentDetails: { duration: 'PT45S' },
      status: { embeddable: true, uploadStatus: 'processed' },
    },
    {
      id: 'offtopic',
      contentDetails: { duration: 'PT20M' },
      status: { embeddable: true, uploadStatus: 'processed' },
    },
    {
      id: 'unembeddable',
      contentDetails: { duration: 'PT20M' },
      status: { embeddable: false, uploadStatus: 'processed' },
    },
  ],
};

const originalKey = process.env.YT_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.YT_KEY;
  else process.env.YT_KEY = originalKey;
});

describe('videos handler', () => {
  it('keeps only embeddable, long, on-topic videos', async () => {
    process.env.YT_KEY = 'test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => ({
        ok: true,
        json: async () => (String(url).includes('/youtube/v3/search?') ? search : details),
      })),
    );

    const res = fakeResponse();
    await handler(request({ topic: 'physics' }) as never, res as never);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.source).toBe('api');
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['keep']);
    expect(body.items[0].durationSec).toBe(1200);
    expect(body.items[0].description).toContain('much longer');

    // The API path is /youtube/v3/search, not /youtube/v3/search.list.
    const urls = (globalThis.fetch as unknown as { mock: { calls: [URL][] } }).mock.calls.map(
      ([url]) => String(url),
    );
    expect(urls[0]).toContain('/youtube/v3/search?');
    expect(urls[1]).toContain('/youtube/v3/videos?');
  });

  it('serves fixtures when no key is set', async () => {
    delete process.env.YT_KEY;

    const res = fakeResponse();
    await handler(request({ topic: 'botany' }) as never, res as never);

    const body = JSON.parse(res.body);
    expect(body.source).toBe('fixtures');
    expect(body.items.length).toBeGreaterThan(0);
  });

  it('rejects an unknown topic', async () => {
    const res = fakeResponse();
    await handler(request({ topic: 'nope' }) as never, res as never);
    expect(res.statusCode).toBe(400);
  });

  it('asks the CDN to cache a normal read and not a refresh', async () => {
    process.env.YT_KEY = 'test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => ({
        ok: true,
        json: async () => (String(url).includes('/youtube/v3/search?') ? search : details),
      })),
    );

    const cached = fakeResponse();
    await handler(request({ topic: 'physics' }) as never, cached as never);
    expect(cached.headers['cache-control']).toContain('s-maxage');

    const refreshed = fakeResponse();
    await handler(request({ topic: 'physics', refresh: '1' }) as never, refreshed as never);
    expect(refreshed.headers['cache-control']).toBe('no-store');
  });
});
