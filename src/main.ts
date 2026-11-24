import './styles.css';
import type { Video } from '../api/filters';
import {
  app,
  canRefresh,
  fetchChannel,
  fetchSearch,
  fetchTopic,
  fetchVideo,
  isStale,
  markOpened,
  markRefresh,
  markWatched,
  readCache,
  readHistory,
  readOpened,
  readSaved,
  readTheme,
  setTheme,
  writeCache,
  writeSaved,
} from './api';
import type { ChannelState, ThemeChoice } from './api';
import * as views from './views';

const main = document.getElementById('main') as HTMLElement;
const bar = document.getElementById('bar') as HTMLElement;
const form = document.getElementById('search-form') as HTMLFormElement;
const input = document.getElementById('q') as HTMLInputElement;
const countdown = document.getElementById('countdown');
const themeToggle = document.getElementById('theme-toggle');

function updateCountdown() {
  if (!countdown) return;
  const target = Date.parse(`${app.exam.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target - today.getTime()) / 86_400_000);
  countdown.hidden = days < 0;
  if (days < 0) return;
  countdown.innerHTML =
    days === 0
      ? `${app.exam.label} · <strong>today</strong>`
      : `${app.exam.label} · <strong>${days} days</strong>`;
}

function paintThemeToggle() {
  if (!themeToggle) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
}

themeToggle?.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  setTheme(dark ? 'light' : 'dark');
  paintThemeToggle();
});

const state: views.State = {
  store: new Map(),
  opened: readOpened(),
  fresh: false,
};

try {
  state.fresh = sessionStorage.getItem('serein:fresh') !== '1';
} catch {
  state.fresh = true;
}

let generation = 0;
// Videos seen from any source (topics, search, a channel) so a click always plays.
const known = new Map<string, Video>();
const channels = new Map<string, ChannelState>();
let webSearch: {
  key: string;
  items: Video[];
  loading: boolean;
  failed: false | 'quota' | 'other';
} | null = null;

function remember(items: Video[]) {
  for (const video of items) known.set(video.id, video);
}

for (const topic of app.topics) {
  const cached = readCache(topic.id);
  if (cached) {
    state.store.set(topic.id, cached);
    remember(cached.items);
  }
}

function findVideo(id: string) {
  const direct = known.get(id);
  if (direct) return direct;
  for (const entry of state.store.values()) {
    const found = entry.items.find((video) => video.id === id);
    if (found) return found;
  }
  return undefined;
}

function localSearch(query: string) {
  const needle = query.toLowerCase();
  const seen = new Set<string>();
  return [...state.store.values()]
    .flatMap((entry) => entry.items)
    .filter((video) => {
      if (seen.has(video.id)) return false;
      const hit =
        video.title.toLowerCase().includes(needle) ||
        video.channel.toLowerCase().includes(needle);
      if (hit) seen.add(video.id);
      return hit;
    });
}

async function loadTopic(topicId: string, refresh = false) {
  try {
    const result = await fetchTopic(topicId, refresh);
    state.store.set(topicId, result);
    remember(result.items);
    writeCache(topicId, result);
  } catch {
    const previous = state.store.get(topicId);
    state.store.set(
      topicId,
      previous
        ? { ...previous, error: true }
        : { items: [], fetchedAt: Date.now(), source: 'api', error: true },
    );
  }
}

function consumeFresh() {
  if (!state.fresh) return;
  state.fresh = false;
  try {
    sessionStorage.setItem('serein:fresh', '1');
  } catch {
    // ignore
  }
}

function revealActiveTab() {
  const active = main.querySelector<HTMLElement>('.tab[aria-current="page"]');
  const tabs = active?.parentElement;
  if (!active || !tabs) return;
  // Seven topics do not fit on a phone; keep the current one in sight.
  const tab = active.getBoundingClientRect();
  const row = tabs.getBoundingClientRect();
  tabs.scrollLeft += tab.left - row.left - (row.width - tab.width) / 2;
}

async function renderHome(gen: number, activeId: string | null) {
  const ids = activeId ? [activeId] : app.topics.map((topic) => topic.id);

  const paint = () => {
    if (gen !== generation) return;
    main.innerHTML = views.home(state, activeId, readHistory());
    if (main.querySelector('.grid')) consumeFresh();
    revealActiveTab();
  };

  paint();

  const stale = ids.filter((id) => {
    const entry = state.store.get(id);
    return !entry || isStale(entry);
  });
  if (stale.length === 0) return;

  await Promise.all(stale.map((id) => loadTopic(id)));
  paint();
}

async function renderWatch(gen: number, id: string) {
  let video = findVideo(id);
  let stored = false;
  if (!video) {
    const saved = readSaved('v:' + id);
    if (saved?.items[0]) {
      video = saved.items[0];
      stored = true;
      remember([video]);
    }
  }
  main.innerHTML = views.watch(video ?? null, false);

  if (!video) {
    // Deep link or reload: ask for this one video (1 unit) instead of every topic.
    try {
      const result = await fetchVideo(id);
      video = result.items[0] ?? undefined;
      if (video) {
        remember([video]);
        writeSaved('v:' + id, result);
      }
    } catch {
      video = undefined;
    }
    if (gen !== generation) return;
  } else if (!stored) {
    // Keep it for the next reload. The watch screen never shows the source note.
    writeSaved('v:' + id, { items: [video], fetchedAt: Date.now(), source: 'api' });
  }

  main.innerHTML = views.watch(video ?? null, true);
  if (video) {
    markOpened(id);
    state.opened.add(id);
    markWatched(video);
  }
}

function renderSearch(gen: number, url: URL) {
  const query = (url.searchParams.get('q') ?? '').trim();
  const sort: views.SearchSort = url.searchParams.get('sort') === 'newest' ? 'newest' : 'relevance';
  const key = `${sort}\n${query}`;

  const paint = () => {
    if (gen !== generation) return;
    main.innerHTML = views.search(state, {
      query,
      sort,
      local: query ? localSearch(query) : [],
      web: webSearch && webSearch.key === key ? webSearch : null,
    });
  };

  if (query && (!webSearch || webSearch.key !== key)) {
    const saved = readSaved(`search:${key}`);
    if (saved) {
      webSearch = { key, items: saved.items, loading: false, failed: false };
      remember(saved.items);
    } else {
      webSearch = { key, items: [], loading: true, failed: false };
      fetchSearch(query, sort)
        .then((result) => {
          if (webSearch?.key === key) {
            webSearch = { key, items: result.items, loading: false, failed: false };
            remember(result.items);
            writeSaved(`search:${key}`, result);
          }
        })
        .catch((error: unknown) => {
          if (webSearch?.key === key) {
            webSearch = {
              key,
              items: [],
              loading: false,
              failed:
                error instanceof Error && error.message === 'quota_exceeded' ? 'quota' : 'other',
            };
          }
        })
        .then(() => {
          if (gen === generation) paint();
        });
    }
  }

  paint();
}

async function renderChannel(gen: number, id: string) {
  const key = `channel:${id}`;
  let cached = channels.get(id);
  if (!cached) {
    const saved = readSaved<ChannelState>(key);
    if (saved) {
      cached = saved;
      channels.set(id, saved);
      remember(saved.items);
    }
  }
  main.innerHTML = views.channel(state, cached?.title ?? '', cached?.items ?? [], !cached);
  if (cached) return;

  try {
    const data = await fetchChannel(id);
    channels.set(id, data);
    writeSaved(key, data);
    remember(data.items);
    if (gen !== generation) return;
    main.innerHTML = views.channel(state, data.title, data.items, false);
  } catch {
    if (gen !== generation) return;
    main.innerHTML = `<div class="view page">
      <a class="back" href="/" data-link>Back</a>
      <div class="empty"><p>Couldn't open this channel.</p></div>
    </div>`;
  }
}

function setMaximized(on: boolean) {
  const watch = document.getElementById('watch');
  if (!watch) return;
  watch.classList.toggle('is-max', on);
  document.documentElement.classList.toggle('is-locked', on);
  const button = watch.querySelector<HTMLButtonElement>('[data-action="maximize"]');
  if (button) {
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? 'Exit' : 'Maximize';
    if (on) button.focus();
  }
}

function render() {
  const gen = ++generation;
  document.documentElement.classList.remove('is-locked');
  updateCountdown();
  const url = new URL(location.href);
  const path = url.pathname;
  input.value = path === '/search' ? (url.searchParams.get('q') ?? '') : '';

  if (path === '/') {
    void renderHome(gen, url.searchParams.get('topic'));
    return;
  }

  if (path.startsWith('/watch/')) {
    void renderWatch(gen, decodeURIComponent(path.slice('/watch/'.length)));
    return;
  }

  if (path.startsWith('/channel/')) {
    void renderChannel(gen, decodeURIComponent(path.slice('/channel/'.length)));
    return;
  }

  if (path === '/search') {
    void renderSearch(gen, url);
    return;
  }

  if (path === '/community') {
    main.innerHTML = views.community(url.searchParams.get('topic'));
    revealActiveTab();
    return;
  }

  if (path === '/resources') {
    main.innerHTML = views.resources(url.searchParams.get('topic'));
    revealActiveTab();
    return;
  }

  if (path === '/history') {
    main.innerHTML = views.history(state, readHistory(), url.searchParams.get('topic'));
    revealActiveTab();
    return;
  }

  if (path === '/settings') {
    main.innerHTML = views.settings();
    return;
  }

  main.innerHTML = `<div class="view page"><div class="empty">
      <p>That page doesn't exist.</p>
      <a class="link" href="/" data-link>Back to your topics</a>
    </div></div>`;
}

function navigate(href: string, replace = false) {
  if (replace) history.replaceState(null, '', href);
  else history.pushState(null, '', href);
  render();
}

document.addEventListener('click', (event) => {
  const anchor = (event.target as HTMLElement).closest('a[data-link]') as HTMLAnchorElement | null;
  if (!anchor) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(anchor.getAttribute('href') ?? '/');
});

main.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!target) return;

  const action = target.dataset.action;

  if (action === 'theme') {
    setTheme(target.dataset.theme as ThemeChoice);
    main.innerHTML = views.settings();
    return;
  }

  if (action === 'maximize') {
    const watch = document.getElementById('watch');
    if (watch) setMaximized(!watch.classList.contains('is-max'));
    return;
  }

  if (action === 'expand') {
    const description = document.getElementById('description');
    if (!description) return;
    const clamped = description.classList.toggle('is-clamped');
    target.textContent = clamped ? 'More' : 'Less';
    target.setAttribute('aria-expanded', String(!clamped));
    return;
  }

  if (action === 'refresh-all') {
    const url = new URL(location.href);
    const activeId = url.pathname === '/' ? url.searchParams.get('topic') : null;
    const ids = activeId ? [activeId] : app.topics.map((topic) => topic.id);
    const allowed = ids.filter(canRefresh);
    const note = document.getElementById('feed-note');
    if (allowed.length === 0) {
      if (note) {
        note.hidden = false;
        note.textContent = 'Refreshed in the last hour. Try again later.';
      }
      return;
    }
    target.setAttribute('aria-busy', 'true');
    target.textContent = 'Refreshing…';
    allowed.forEach(markRefresh);
    void Promise.all(allowed.map((id) => loadTopic(id, true))).then(render);
    return;
  }

  if (action === 'refresh') {
    const topicId = target.dataset.topic;
    if (!topicId || !canRefresh(topicId)) return;
    markRefresh(topicId);
    target.setAttribute('aria-busy', 'true');
    void loadTopic(topicId, true).then(render);
  }
});

// Clicking the empty space around a maximized stage leaves it.
main.addEventListener('click', (event) => {
  const watch = document.querySelector<HTMLElement>('.watch.is-max');
  if (watch && event.target === watch) setMaximized(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.watch.is-max')) setMaximized(false);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
});

window.addEventListener('popstate', render);
window.addEventListener('online', render);
window.addEventListener('offline', render);

const onScroll = () => bar.classList.toggle('is-stuck', window.scrollY > 0);
window.addEventListener('scroll', onScroll, { passive: true });

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (readTheme() === 'auto') {
    setTheme('auto');
    paintThemeToggle();
  }
});

document.title = app.appName;
const wordmark = document.querySelector('.wordmark__text');
if (wordmark) wordmark.textContent = app.appName;

paintThemeToggle();
onScroll();
render();

// Keeps the shell openable offline. Never caches /api/, so Refresh stays honest.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
