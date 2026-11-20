import appConfig from '../config/app.json';
import type { Topic, Video } from '../api/filters';

export type Limits = {
  perTopic: number;
  homeTotal: number;
  minDurationSec: number;
  cacheHours: number;
  manualRefreshMinutes: number;
};

export const app = appConfig as unknown as {
  appName: string;
  topics: Topic[];
  limits: Limits;
};

export type TopicState = {
  items: Video[];
  fetchedAt: number;
  source: 'api' | 'fixtures';
  error?: boolean;
};

const CACHE = 'serein:v1:';
const OPENED = 'serein:opened';
const REFRESH = 'serein:refresh:';

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
  if (!response.ok) throw new Error(`http_${response.status}`);
  return (await response.json()) as TopicState;
}

export const fetchTopic = (topicId: string, refresh = false) =>
  request(refresh ? { topic: topicId, refresh: '1' } : { topic: topicId });

export const fetchSearch = (topicId: string, text: string) =>
  request({ topic: topicId, q: text });

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
