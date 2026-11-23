import type { IncomingMessage, ServerResponse } from 'node:http';
import appConfig from '../config/app.json' with { type: 'json' };
import fixtures from '../fixtures/videos.json' with { type: 'json' };
import {
  channelAllowed,
  decodeEntities,
  dedupe,
  hasPhrase,
  hasPrefix,
  matchesRules,
  parseISODuration,
} from './filters.js';
import type { Topic, Video } from './filters';

type Limits = {
  perTopic: number;
  homeTotal: number;
  searchResults: number;
  minDurationSec: number;
  cacheHours: number;
  manualRefreshMinutes: number;
};

const config = appConfig as unknown as {
  appName: string;
  channels: string[];
  blocked?: string[];
  topics: Topic[];
  limits: Limits;
};

type Query = Record<string, string | string[] | undefined>;
type Req = IncomingMessage & { query?: Query };

const API = 'https://www.googleapis.com/youtube/v3';

class UpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: unknown, cache?: string) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cache) res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(body));
}

async function call(endpoint: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('key', process.env.YT_KEY ?? '');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new UpstreamError(
      response.status,
      `${endpoint} ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as Record<string, any>;
}

/** One search.list (100 units) plus one videos.list (1 unit) for the topic. */
async function fetchTopic(topic: Topic, limits: Limits): Promise<Video[]> {
  const search = await call('search', {
    part: 'snippet',
    type: 'video',
    maxResults: 50,
    q: topic.query,
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'moderate',
    relevanceLanguage: topic.language,
    videoCategoryId: topic.categoryId,
    videoDuration: topic.duration && topic.duration !== 'any' ? topic.duration : undefined,
    order: topic.order,
    // Keep the feed current: nothing older than two years gets in.
    publishedAfter: new Date(Date.now() - 730 * 86_400_000).toISOString(),
  });

  const candidates: { id: string; snippet: any }[] = (search.items ?? [])
    .map((item: any) => ({ id: item.id?.videoId, snippet: item.snippet }))
    .filter((item: any) => Boolean(item.id))
    // Only the owner's study channels; this is the hard content boundary.
    .filter((item: any) => channelAllowed(item.snippet?.channelTitle ?? '', config.channels));

  if (candidates.length === 0) return [];

  const details = await call('videos', {
    part: 'snippet,contentDetails,status',
    id: candidates.map((item) => item.id).join(','),
  });

  const byId = new Map<string, any>(
    (details.items ?? []).map((item: any) => [item.id, item]),
  );

  const kept: Video[] = [];
  for (const { id, snippet } of candidates) {
    const detail = byId.get(id);
    if (!detail) continue;
    if (detail.status?.embeddable === false) continue;
    if (detail.status?.uploadStatus !== 'processed') continue;
    if (snippet?.liveBroadcastContent && snippet.liveBroadcastContent !== 'none') continue;

    const durationSec = parseISODuration(detail.contentDetails?.duration ?? '');
    if (durationSec < limits.minDurationSec) continue;

    const info = detail.snippet ?? {};

    const video = {
      id,
      title: decodeEntities(info.title ?? snippet.title ?? ''),
      channel: decodeEntities(info.channelTitle ?? snippet.channelTitle ?? ''),
      channelId: info.channelId ?? snippet.channelId ?? '',
      durationSec,
      publishedAt: info.publishedAt ?? snippet.publishedAt ?? '',
      // search.list truncates the description; videos.list has the whole one.
      description: decodeEntities(info.description ?? snippet.description ?? ''),
      thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? '',
    };

    if (!matchesRules(video, topic.include, topic.exclude)) continue;
    kept.push(video);
  }

  // Newest first inside the recent window, so the feed never feels stale.
  kept.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return kept.slice(0, limits.perTopic);
}

/** A raw YouTube search: no channel or topic rules. Relevance or newest. */
async function searchVideos(text: string, limits: Limits, newest = false): Promise<Video[]> {
  const search = await call('search', {
    part: 'snippet',
    type: 'video',
    maxResults: limits.searchResults,
    q: text,
    videoEmbeddable: 'true',
    safeSearch: 'none',
    relevanceLanguage: 'en',
    order: newest ? 'date' : 'relevance',
  });

  const candidates: { id: string; snippet: any }[] = (search.items ?? [])
    .map((item: any) => ({ id: item.id?.videoId, snippet: item.snippet }))
    .filter((item: any) => Boolean(item.id));

  if (candidates.length === 0) return [];

  const details = await call('videos', {
    part: 'snippet,contentDetails,status',
    id: candidates.map((item) => item.id).join(','),
  });
  const byId = new Map<string, any>((details.items ?? []).map((item: any) => [item.id, item]));

  const kept: Video[] = [];
  for (const { id, snippet } of candidates) {
    const detail = byId.get(id);
    // Embeddable is playback, not content: every row has to play in this app.
    if (!detail || detail.status?.embeddable === false) continue;
    const info = detail.snippet ?? {};
    const title = decodeEntities(info.title ?? snippet.title ?? '');
    // Reality-show noise stays out of search, in English and Hindi.
    const blocked = config.blocked ?? [];
    const noise = blocked.some((phrase) =>
      phrase.length <= 2 ? hasPrefix(title, phrase) : hasPhrase(title, phrase),
    );
    if (noise) continue;
    kept.push({
      id,
      title,
      channel: decodeEntities(info.channelTitle ?? snippet.channelTitle ?? ''),
      channelId: info.channelId ?? snippet.channelId ?? '',
      durationSec: parseISODuration(detail.contentDetails?.duration ?? ''),
      publishedAt: info.publishedAt ?? snippet.publishedAt ?? '',
      description: decodeEntities(info.description ?? snippet.description ?? ''),
      thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? '',
    });
  }
  return kept;
}

const channelSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** A whole channel, newest first, with no topic or channel rules. */
async function fetchChannel(id: string): Promise<{ title: string; items: Video[] } | null> {
  const info = await call('channels', { part: 'snippet,contentDetails', id });
  const channel = (info.items ?? [])[0];
  if (!channel) return null;

  const title = decodeEntities(channel.snippet?.title ?? '');
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return { title, items: [] };

  const list = await call('playlistItems', {
    part: 'contentDetails',
    playlistId: uploads,
    maxResults: 30,
  });
  const ids: string[] = (list.items ?? [])
    .map((item: any) => item.contentDetails?.videoId)
    .filter(Boolean);
  if (ids.length === 0) return { title, items: [] };

  const details = await call('videos', {
    part: 'snippet,contentDetails,status',
    id: ids.join(','),
  });
  const byId = new Map<string, any>((details.items ?? []).map((item: any) => [item.id, item]));

  const items: Video[] = [];
  for (const videoId of ids) {
    const detail = byId.get(videoId);
    if (!detail || detail.status?.embeddable === false) continue;
    const snippet = detail.snippet ?? {};
    items.push({
      id: videoId,
      title: decodeEntities(snippet.title ?? ''),
      channel: decodeEntities(snippet.channelTitle ?? title),
      channelId: snippet.channelId ?? id,
      durationSec: parseISODuration(detail.contentDetails?.duration ?? ''),
      publishedAt: snippet.publishedAt ?? '',
      description: decodeEntities(snippet.description ?? ''),
      thumbnail:
        snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? '',
    });
  }
  return { title, items };
}

function fixtureVideos(topic: Topic | null, text: string | undefined): Video[] {
  const items = (fixtures.items as any[])
    .filter((item) => !topic || item.topicIds.includes(topic.id))
    .filter((item) => !text || hasPhrase(`${item.title}\n${item.channel}`, text))
    .map((item) => {
      const { topicIds: _ignored, ...video } = item;
      return {
        ...video,
        channelId: item.channelId ?? `fixture-${channelSlug(item.channel)}`,
      } as Video;
    });
  return dedupe(items).slice(0, text ? config.limits.searchResults : config.limits.perTopic);
}

function fixtureChannel(id: string): { title: string; items: Video[] } | null {
  const items = fixtureVideos(null, undefined).filter((video) => video.channelId === id);
  if (items.length === 0) return null;
  return { title: items[0].channel, items };
}

function fail(res: ServerResponse, error: unknown) {
  console.error('videos', error);
  // The daily search quota is a wait, not a fault; say so instead of "connection problem".
  if (error instanceof UpstreamError && error.status === 429) {
    return send(res, 503, { error: 'quota_exceeded' }, 'no-store');
  }
  return send(res, 502, { error: 'upstream_failed' }, 'no-store');
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });

  const query = req.query ?? {};
  const param = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const topicId = param('topic');
  const channelId = param('channel');
  const text = param('q')?.trim() || undefined;
  const refresh = param('refresh') === '1';

  if (channelId) {
    const cache = 'public, s-maxage=3600, stale-while-revalidate=86400';
    if (!process.env.YT_KEY) {
      const found = fixtureChannel(channelId);
      return found
        ? send(res, 200, { ...found, fetchedAt: Date.now(), source: 'fixtures' }, 'no-store')
        : send(res, 404, { error: 'unknown_channel' }, 'no-store');
    }
    try {
      const found = await fetchChannel(channelId);
      return found
        ? send(res, 200, { ...found, fetchedAt: Date.now(), source: 'api' }, cache)
        : send(res, 404, { error: 'unknown_channel' }, 'no-store');
    } catch (error) {
      return fail(res, error);
    }
  }

  if (text) {
    const cache = 'public, s-maxage=3600, stale-while-revalidate=86400';
    if (!process.env.YT_KEY) {
      return send(
        res,
        200,
        { items: fixtureVideos(null, text), fetchedAt: Date.now(), source: 'fixtures' },
        'no-store',
      );
    }
    try {
      const items = await searchVideos(text, config.limits, param('sort') === 'newest');
      return send(res, 200, { items, fetchedAt: Date.now(), source: 'api' }, cache);
    } catch (error) {
      return fail(res, error);
    }
  }

  const topic = config.topics.find((item) => item.id === topicId);
  if (!topic) return send(res, 400, { error: 'unknown_topic' }, 'no-store');

  const cache = refresh
    ? 'no-store'
    : `public, s-maxage=${config.limits.cacheHours * 3600}, stale-while-revalidate=86400`;

  if (!process.env.YT_KEY) {
    return send(
      res,
      200,
      { items: fixtureVideos(topic, undefined), fetchedAt: Date.now(), source: 'fixtures' },
      'no-store',
    );
  }

  try {
    const items = await fetchTopic(topic, config.limits);
    return send(res, 200, { items, fetchedAt: Date.now(), source: 'api' }, cache);
  } catch (error) {
    return fail(res, error);
  }
}
