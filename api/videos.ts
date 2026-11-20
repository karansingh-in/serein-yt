import type { IncomingMessage, ServerResponse } from 'node:http';
import appConfig from '../config/app.json';
import fixtures from '../fixtures/videos.json';
import {
  channelAllowed,
  decodeEntities,
  dedupe,
  hasPhrase,
  matchesRules,
  parseISODuration,
} from './filters';
import type { Topic, Video } from './filters';

type Limits = {
  perTopic: number;
  homeTotal: number;
  minDurationSec: number;
  cacheHours: number;
  manualRefreshMinutes: number;
};

const config = appConfig as unknown as {
  appName: string;
  channels: string[];
  topics: Topic[];
  limits: Limits;
};

type Query = Record<string, string | string[] | undefined>;
type Req = IncomingMessage & { query?: Query };

const API = 'https://www.googleapis.com/youtube/v3';

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
    throw new Error(`${endpoint} ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as Record<string, any>;
}

/** One search.list (100 units) plus one videos.list (1 unit) for the topic. */
async function fetchTopic(topic: Topic, text: string | undefined, limits: Limits): Promise<Video[]> {
  const search = await call('search', {
    part: 'snippet',
    type: 'video',
    maxResults: 50,
    q: text ? `${text} ${topic.query}` : topic.query,
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'moderate',
    relevanceLanguage: topic.language,
    videoCategoryId: topic.categoryId,
    videoDuration: topic.duration && topic.duration !== 'any' ? topic.duration : undefined,
    order: topic.order,
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
      durationSec,
      publishedAt: info.publishedAt ?? snippet.publishedAt ?? '',
      // search.list truncates the description; videos.list has the whole one.
      description: decodeEntities(info.description ?? snippet.description ?? ''),
      thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? '',
    };

    if (!matchesRules(video, topic.include, topic.exclude)) continue;
    kept.push(video);
    if (kept.length >= limits.perTopic) break;
  }

  return kept;
}

function fixtureVideos(topic: Topic, text: string | undefined): Video[] {
  const items = (fixtures.items as any[])
    .filter((item) => item.topicIds.includes(topic.id))
    .filter((item) => !text || hasPhrase(`${item.title}\n${item.channel}`, text))
    .map(({ topicIds: _ignored, ...video }) => video as Video);
  return dedupe(items).slice(0, config.limits.perTopic);
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });

  const query = req.query ?? {};
  const param = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const topicId = param('topic');
  const text = param('q')?.trim() || undefined;
  const refresh = param('refresh') === '1';

  const topic = config.topics.find((item) => item.id === topicId);
  if (!topic) return send(res, 400, { error: 'unknown_topic' }, 'no-store');

  const cache = refresh
    ? 'no-store'
    : `public, s-maxage=${config.limits.cacheHours * 3600}, stale-while-revalidate=86400`;

  if (!process.env.YT_KEY) {
    return send(
      res,
      200,
      { items: fixtureVideos(topic, text), fetchedAt: Date.now(), source: 'fixtures' },
      'no-store',
    );
  }

  try {
    const items = await fetchTopic(topic, text, config.limits);
    return send(res, 200, { items, fetchedAt: Date.now(), source: 'api' }, cache);
  } catch (error) {
    console.error('videos', error);
    return send(res, 502, { error: 'upstream_failed' }, 'no-store');
  }
}
