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

const snippet = (title: string, channel = 'Example Academy') => ({
  title,
  channelTitle: channel,
  publishedAt: '2026-11-18T00:00:00Z',
  description: 'A lecture.',
  liveBroadcastContent: 'none',
  thumbnails: { high: { url: 'https://i.ytimg.com/vi/x/hq.jpg' } },
});

const search = {
  items: [
    { id: { videoId: 'keep' }, snippet: snippet('Linear algebra lecture one') },
    { id: { videoId: 'short' }, snippet: snippet('Linear algebra in 45 seconds') },
    { id: { videoId: 'offtopic' }, snippet: snippet('Cooking pasta at home') },
    { id: { videoId: 'unembeddable' }, snippet: snippet('Linear algebra matrix tricks') },
  ],
};

const details = {
  items: [
    {
      id: 'keep',
      contentDetails: { duration: 'PT20M' },
      status: { embeddable: true, uploadStatus: 'processed' },
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
        json: async () => (String(url).includes('search.list') ? search : details),
      })),
    );

    const res = fakeResponse();
    await handler(request({ topic: 'linear-algebra' }) as never, res as never);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.source).toBe('api');
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['keep']);
    expect(body.items[0].durationSec).toBe(1200);
  });

  it('serves fixtures when no key is set', async () => {
    delete process.env.YT_KEY;

    const res = fakeResponse();
    await handler(request({ topic: 'statistics' }) as never, res as never);

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
        json: async () => (String(url).includes('search.list') ? search : details),
      })),
    );

    const cached = fakeResponse();
    await handler(request({ topic: 'linear-algebra' }) as never, cached as never);
    expect(cached.headers['cache-control']).toContain('s-maxage');

    const refreshed = fakeResponse();
    await handler(request({ topic: 'linear-algebra', refresh: '1' }) as never, refreshed as never);
    expect(refreshed.headers['cache-control']).toBe('no-store');
  });
});
