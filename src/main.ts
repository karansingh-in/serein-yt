import './styles.css';
import type { Video } from '../api/filters';
import {
  app,
  canRefresh,
  fetchSearch,
  fetchTopic,
  isStale,
  markOpened,
  markRefresh,
  readCache,
  readOpened,
  readTheme,
  setTheme,
  writeCache,
} from './api';
import type { ThemeChoice } from './api';
import * as views from './views';

const main = document.getElementById('main') as HTMLElement;
const bar = document.getElementById('bar') as HTMLElement;
const form = document.getElementById('search-form') as HTMLFormElement;
const input = document.getElementById('q') as HTMLInputElement;

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

for (const topic of app.topics) {
  const cached = readCache(topic.id);
  if (cached) state.store.set(topic.id, cached);
}

let generation = 0;
let webSearch: {
  key: string;
  items: Video[];
  loading: boolean;
  failed: false | 'quota' | 'other';
} | null = null;

function findVideo(id: string) {
  for (const entry of state.store.values()) {
    const found = entry.items.find((video) => video.id === id);
    if (found) return found;
  }
  return undefined;
}

function localSearch(query: string, topicId: string | null) {
  const needle = query.toLowerCase();
  const entries = topicId ? [state.store.get(topicId)] : [...state.store.values()];
  const seen = new Set<string>();
  return entries
    .flatMap((entry) => entry?.items ?? [])
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

async function renderHome(gen: number, activeId: string | null) {
  const ids = activeId ? [activeId] : app.topics.map((topic) => topic.id);

  const paint = () => {
    if (gen !== generation) return;
    main.innerHTML = views.home(state, activeId);
    if (main.querySelector('.grid')) consumeFresh();
    const active = main.querySelector<HTMLElement>('.tab[aria-current="page"]');
    const tabs = active?.parentElement;
    // Seven topics do not fit on a phone; keep the current one in sight.
    if (active && tabs) {
      const tab = active.getBoundingClientRect();
      const row = tabs.getBoundingClientRect();
      tabs.scrollLeft += tab.left - row.left - (row.width - tab.width) / 2;
    }
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
  main.innerHTML = views.watch(video ?? null, false);

  if (video) {
    markOpened(id);
    state.opened.add(id);
    return;
  }

  await Promise.all(app.topics.map((topic) => loadTopic(topic.id)));
  if (gen !== generation) return;
  video = findVideo(id);
  main.innerHTML = views.watch(video ?? null, true);
  if (video) {
    markOpened(id);
    state.opened.add(id);
  }
}

async function renderSearch(gen: number, url: URL) {
  const query = (url.searchParams.get('q') ?? '').trim();
  const activeId = url.searchParams.get('topic');
  const wantsWeb = url.searchParams.get('web') === '1' && Boolean(query) && Boolean(activeId);
  const key = `${activeId}|${query}`;
  const ids = activeId ? [activeId] : app.topics.map((topic) => topic.id);

  // Local search reads the cached topics, so a cold or half-loaded visit has to fill them first.
  const loading = () =>
    ids.some((id) => {
      const entry = state.store.get(id);
      return !entry || isStale(entry);
    });

  const paint = () => {
    if (gen !== generation) return;
    main.innerHTML = views.search(state, {
      query,
      activeId,
      local: query ? localSearch(query, activeId) : [],
      web: webSearch && webSearch.key === key ? webSearch : null,
      loading: loading(),
    });
  };

  const work: Promise<unknown>[] = [];

  if (loading()) {
    work.push(
      Promise.all(ids.map((id) => loadTopic(id))).then(() => {
        if (gen === generation) paint();
      }),
    );
  }

  if (wantsWeb && (!webSearch || webSearch.key !== key)) {
    webSearch = { key, items: [], loading: true, failed: false };
    work.push(
      fetchSearch(activeId!, query)
        .then((result) => {
          if (webSearch?.key === key) webSearch = { key, items: result.items, loading: false, failed: false };
        })
        .catch((error: unknown) => {
          if (webSearch?.key === key) {
            webSearch = {
              key,
              items: [],
              loading: false,
              failed: error instanceof Error && error.message === 'quota_exceeded' ? 'quota' : 'other',
            };
          }
        })
        .then(() => {
          if (gen === generation) paint();
        }),
    );
  }

  paint();
  await Promise.all(work);
}

function render() {
  const gen = ++generation;
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

  if (path === '/search') {
    void renderSearch(gen, url);
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

  if (action === 'expand') {
    const description = document.getElementById('description');
    if (!description) return;
    const clamped = description.classList.toggle('is-clamped');
    target.textContent = clamped ? 'More' : 'Less';
    target.setAttribute('aria-expanded', String(!clamped));
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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  const here = new URL(location.href);
  const topic = here.pathname === '/search' ? here.searchParams.get('topic') : null;
  const keep = topic ? `&topic=${encodeURIComponent(topic)}` : '';
  navigate(query ? `/search?q=${encodeURIComponent(query)}${keep}` : '/search');
});

window.addEventListener('popstate', render);
window.addEventListener('online', render);
window.addEventListener('offline', render);

const onScroll = () => bar.classList.toggle('is-stuck', window.scrollY > 0);
window.addEventListener('scroll', onScroll, { passive: true });

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (readTheme() === 'auto') setTheme('auto');
});

document.title = app.appName;
const wordmark = document.querySelector('.wordmark');
if (wordmark) wordmark.textContent = app.appName;

onScroll();
render();
