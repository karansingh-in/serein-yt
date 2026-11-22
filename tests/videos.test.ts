import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/videos';

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
    { id: { videoId: 'blocked' }, snippet: snippet('Bigg Boss 18 grand finale') },
    { id: { videoId: 'blockedHindi' }, snippet: snippet('बिग बॉस आज का एपिसोड') },
    { id: { videoId: 'blockedHashtag' }, snippet: snippet('#BBMS8ViralCuts') },
    { id: { videoId: 'blockedDoubleG' }, snippet: snippet('Biggboss Malayalam troll video') },
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
    {
      id: 'wrongchannel',
      contentDetails: { duration: 'PT20M' },
      status: { embeddable: true, uploadStatus: 'processed' },
      snippet: { title: 'Physics lecture from elsewhere', description: 'Elsewhere.' },
    },
    {
      id: 'blocked',
      contentDetails: { duration: 'PT40M' },
      status: { embeddable: true, uploadStatus: 'processed' },
      snippet: { title: 'Bigg Boss 18 grand finale', description: 'Not for this app.' },
    },
    {
      id: 'blockedHindi',
      contentDetails: { duration: 'PT40M' },
      status: { embeddable: true, uploadStatus: 'processed' },
      snippet: { title: 'बिग बॉस आज का एपिसोड', description: 'Not for this app.' },
    },
    {
      id: 'blockedHashtag',
      contentDetails: { duration: 'PT40M' },
      status: { embeddable: true, uploadStatus: 'processed' },
      snippet: { title: '#BBMS8ViralCuts', description: 'Not for this app.' },
    },
    {
      id: 'blockedDoubleG',
      contentDetails: { duration: 'PT40M' },
      status: { embeddable: true, uploadStatus: 'processed' },
      snippet: { title: 'Biggboss Malayalam troll video', description: 'Not for this app.' },
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

  it('reports an exhausted quota separately from a broken upstream', async () => {
    process.env.YT_KEY = 'test';
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, text: async () => '{"error":{"code":429}}' })),
    );

    const res = fakeResponse();
    await handler(request({ topic: 'physics' }) as never, res as never);

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toBe('quota_exceeded');
    quiet.mockRestore();
  });

  it('searches YouTube as-is, without the topic filters', async () => {
    process.env.YT_KEY = 'test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => ({
        ok: true,
        json: async () => (String(url).includes('/youtube/v3/search?') ? search : details),
      })),
    );

    const res = fakeResponse();
    await handler(request({ q: 'gravitation' }) as never, res as never);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Short, off-topic and off-channel results stay: search matches YouTube, only playback is checked.
    expect(body.items.map((item: { id: string }) => item.id)).toEqual([
      'keep',
      'short',
      'offtopic',
      'wrongchannel',
    ]);

    const url = String(
      (globalThis.fetch as unknown as { mock: { calls: [URL][] } }).mock.calls[0][0],
    );
    expect(url).toContain('q=gravitation');
    expect(url).not.toContain('videoCategoryId');
  });

  it('opens a channel unfiltered, newest first', async () => {
    process.env.YT_KEY = 'test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        const href = String(url);
        if (href.includes('/channels?')) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  snippet: { title: 'Physics Wallah' },
                  contentDetails: { relatedPlaylists: { uploads: 'UU1' } },
                },
              ],
            }),
          };
        }
        if (href.includes('/playlistItems?')) {
          return {
            ok: true,
            json: async () => ({
              items: [
                { contentDetails: { videoId: 'a' } },
                { contentDetails: { videoId: 'b' } },
              ],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'a',
                contentDetails: { duration: 'PT10M' },
                status: { embeddable: true },
                snippet: {
                  title: 'Any topic at all',
                  channelTitle: 'Physics Wallah',
                  channelId: 'UC1',
                  publishedAt: '2026-11-20T00:00:00Z',
                  description: 'Short.',
                  thumbnails: {},
                },
              },
              {
                id: 'b',
                contentDetails: { duration: 'PT10M' },
                status: { embeddable: false },
                snippet: { title: 'Cannot embed', channelTitle: 'Physics Wallah', channelId: 'UC1' },
              },
            ],
          }),
        };
      }),
    );

    const res = fakeResponse();
    await handler(request({ channel: 'UC1' }) as never, res as never);

    const body = JSON.parse(res.body);
    expect(body.title).toBe('Physics Wallah');
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['a']);
    expect(body.items[0].channelId).toBe('UC1');
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
