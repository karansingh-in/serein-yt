import appConfig from '../config/app.json';
import type { Topic, Video } from '../api/filters';

export type Limits = {
  perTopic: number;
  homeTotal: number;
  searchResults: number;
  minDurationSec: number;
  cacheHours: number;
  manualRefreshMinutes: number;
};

export const app = appConfig as unknown as {
  appName: string;
  topics: Topic[];
  community: CommunityLink[];
  resources: CommunityLink[];
  exam: { label: string; date: string };
  limits: Limits;
};

export type TopicState = {
  items: Video[];
  fetchedAt: number;
  source: 'api' | 'fixtures';
  error?: boolean;
};

export type ChannelState = TopicState & { title: string };

export type CommunityLink = { label: string; href: string; note: string };

export type HistoryEntry = {
  video: Video;
  watchedAt: number;
  /** Seconds in, when the player reported a position. */
  position?: number;
  duration?: number;
};

const CACHE = 'serein:v1:';
const OPENED = 'serein:opened';
const REFRESH = 'serein:refresh:';
const HISTORY = 'serein:history';

export function readCache(topicId: string): TopicState | null {
  try {
    const raw = localStorage.getItem(CACHE + topicId);
    return raw ? (JSON.parse(raw) as TopicState) : null;
  } catch {
    return null;
  }
}

export function writeCache(topicId: string, state: TopicState) {
  try {
    localStorage.setItem(CACHE + topicId, JSON.stringify({ ...state, error: undefined }));
  } catch {
    // storage full or blocked; the in-memory copy still works for this visit
  }
}

export function isStale(state: TopicState) {
  return Date.now() - state.fetchedAt > app.limits.cacheHours * 3_600_000;
}

const SAVED = 'saved:';
const SAVED_MAX = 8;

/** Search, channel and single-video answers, kept so a reload costs no quota. */
export function readSaved<T extends TopicState = TopicState>(key: string): T | null {
  const state = readCache(SAVED + key);
  return state && !isStale(state) ? (state as T) : null;
}

export function writeSaved(key: string, state: TopicState) {
  // Trim first, so a full store still has room for this answer; the cap stays at eight.
  pruneSaved(SAVED_MAX - 1);
  writeCache(SAVED + key, state);
}

function pruneSaved(keep: number) {
  try {
    const prefix = CACHE + SAVED;
    const entries: { key: string; at: number }[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      entries.push({ key, at: raw ? Number(JSON.parse(raw).fetchedAt) || 0 : 0 });
    }
    entries.sort((a, b) => b.at - a.at);
    for (const entry of entries.slice(keep)) localStorage.removeItem(entry.key);
  } catch {
    // storage blocked or full; the in-memory copy still works for this visit
  }
}

async function request(params: Record<string, string>): Promise<TopicState> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/videos?${query}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `http_${response.status}`);
  }
  return (await response.json()) as TopicState;
}

export const fetchTopic = (topicId: string, refresh = false) =>
  request(refresh ? { topic: topicId, refresh: '1' } : { topic: topicId });

export const fetchSearch = (text: string, sort: 'relevance' | 'newest' = 'relevance') =>
  request(sort === 'newest' ? { q: text, sort } : { q: text });

export const fetchChannel = (id: string) =>
  request({ channel: id }) as Promise<ChannelState>;

export const fetchVideo = (id: string) => request({ v: id });

export function readOpened(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(OPENED) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function markOpened(id: string) {
  const ids = [...readOpened(), id].slice(-500);
  try {
    localStorage.setItem(OPENED, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function readHistory(): HistoryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY) ?? '[]');
    return Array.isArray(raw) ? (raw as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function markWatched(video: Video) {
  try {
    const entries = readHistory();
    // Keep where the last session stopped; this call only moves the entry to the top.
    const previous = entries.find((entry) => entry.video.id === video.id);
    const rest = entries.filter((entry) => entry.video.id !== video.id);
    localStorage.setItem(
      HISTORY,
      JSON.stringify(
        [
          {
            video,
            watchedAt: Date.now(),
            position: previous?.position,
            duration: previous?.duration,
          },
          ...rest,
        ].slice(0, 60),
      ),
    );
  } catch {
    // storage full or blocked
  }
}

/** Remember how far playback got, so the next open can resume there. */
export function markProgress(id: string, position: number, duration: number) {
  try {
    const entries = readHistory();
    const entry = entries.find((item) => item.video.id === id);
    if (!entry) return;
    entry.position = Math.floor(position);
    entry.duration = Math.floor(duration);
    localStorage.setItem(HISTORY, JSON.stringify(entries));
  } catch {
    // storage full or blocked
  }
}

export function clearProgress(id: string) {
  try {
    const entries = readHistory();
    const entry = entries.find((item) => item.video.id === id);
    if (!entry || entry.position === undefined) return;
    delete entry.position;
    delete entry.duration;
    localStorage.setItem(HISTORY, JSON.stringify(entries));
  } catch {
    // storage full or blocked
  }
}

export function canRefresh(topicId: string) {
  try {
    const last = Number(localStorage.getItem(REFRESH + topicId) ?? 0);
    return Date.now() - last > app.limits.manualRefreshMinutes * 60_000;
  } catch {
    return true;
  }
}

export function markRefresh(topicId: string) {
  try {
    localStorage.setItem(REFRESH + topicId, String(Date.now()));
  } catch {
    // ignore
  }
}

export type ThemeChoice = 'light' | 'dark' | 'auto';

export function readTheme(): ThemeChoice {
  const value = document.documentElement.dataset.themeChoice;
  return value === 'dark' || value === 'light' ? value : 'auto';
}

export function setTheme(choice: ThemeChoice) {
  const dark =
    choice === 'dark' ||
    (choice === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeChoice = choice;
  try {
    localStorage.setItem('serein:theme', choice);
  } catch {
    // ignore
  }
}
