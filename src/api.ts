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

export type HistoryEntry = { video: Video; watchedAt: number };

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
    const rest = readHistory().filter((entry) => entry.video.id !== video.id);
    localStorage.setItem(
      HISTORY,
      JSON.stringify([{ video, watchedAt: Date.now() }, ...rest].slice(0, 60)),
    );
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
