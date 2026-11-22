import { interleave } from '../api/filters';
import type { Video } from '../api/filters';
import { app, canRefresh, readTheme } from './api';
import type { TopicState } from './api';

export type State = {
  store: Map<string, TopicState>;
  opened: Set<string>;
  fresh: boolean;
};

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

export function minutes(seconds: number) {
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function ago(iso: string) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  if (months < 12) return months <= 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.round(days / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
}

const timeOf = (stamp: number) =>
  new Date(stamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const metaLine = (video: Video) =>
  [video.channel, minutes(video.durationSec), ago(video.publishedAt)].filter(Boolean).join(', ');

function card(video: Video, opened: Set<string>) {
  return `<a class="card${opened.has(video.id) ? ' is-seen' : ''}" href="/watch/${video.id}" data-link>
      <div class="thumb"><img src="${esc(video.thumbnail)}" alt="" width="640" height="360" loading="lazy" decoding="async"></div>
      <h3 class="card__title">${esc(video.title)}</h3>
      <p class="card__meta">${esc(metaLine(video))}</p>
    </a>`;
}

const skeletons = (count: number) =>
  Array.from(
    { length: count },
    () => `<div class="card card--skeleton" aria-hidden="true">
      <div class="thumb skeleton"></div>
      <div class="line skeleton"></div>
      <div class="line line--short skeleton"></div>
    </div>`,
  ).join('');

function tabs(activeId: string | null, href: (id: string | null) => string) {
  const items = [{ id: null, label: 'All' }, ...app.topics.map((t) => ({ id: t.id, label: t.label }))];
  return `<nav class="tabs" aria-label="Topics">${items
    .map(
      (item) => `<a class="tab" href="${href(item.id)}" data-link${
        activeId === item.id ? ' aria-current="page"' : ''
      }>${esc(item.label)}</a>`,
    )
    .join('')}</nav>`;
}

export function home(state: State, activeId: string | null) {
  const topics = activeId ? app.topics.filter((t) => t.id === activeId) : app.topics;
  const known = topics.filter((topic) => state.store.has(topic.id));
  const loading = known.length < topics.length;

  const items = activeId
    ? (state.store.get(activeId)?.items ?? [])
    : interleave(
        topics.map((topic) => state.store.get(topic.id)?.items ?? []),
        app.limits.homeTotal,
      );

  const failed = topics.filter((topic) => state.store.get(topic.id)?.error);
  const fixtures = topics.some((topic) => state.store.get(topic.id)?.source === 'fixtures');
  const savedAt = failed
    .map((topic) => state.store.get(topic.id)!.fetchedAt)
    .sort((a, b) => b - a)[0];

  const notice = failed.length
    ? `<p class="note" role="status">Couldn't refresh. Showing what was saved at ${timeOf(savedAt)}.</p>`
    : '';
  const offline =
    !navigator.onLine && items.length
      ? `<p class="note" role="status">You're offline. Showing what was saved.</p>`
      : '';
  const sample = fixtures
    ? `<p class="note">Sample videos. Add an API key to see live results.</p>`
    : '';

  let body: string;
  if (items.length) {
    body = `<div class="grid"${state.fresh ? ' data-fresh' : ''}>${items
      .map((video) => card(video, state.opened))
      .join('')}</div>
      <p class="end">That's everything on your topics.</p>`;
  } else if (loading) {
    body = `<div class="grid" aria-busy="true">${skeletons(6)}</div>`;
  } else if (failed.length) {
    body = `<div class="empty">
        <p>Couldn't load your topics.</p>
        <button class="link" type="button" data-action="refresh" data-topic="${failed[0].id}">Try again</button>
      </div>`;
  } else {
    body = `<div class="empty">
        <p>Nothing new today.</p>
        ${
          activeId && canRefresh(activeId)
            ? `<button class="link" type="button" data-action="refresh" data-topic="${activeId}">Refresh</button>`
            : ''
        }
      </div>`;
  }

  return `<div class="view page">
      ${tabs(activeId, (id) => (id ? `/?topic=${id}` : '/'))}
      ${notice}${offline}${sample}
      ${body}
    </div>`;
}

export function watch(video: Video | null, notFound: boolean) {
  if (!video) {
    return `<div class="view page">
        <a class="back" href="/" data-link>Back</a>
        <div class="empty">
          <p>${notFound ? "This video isn't in your topics." : 'Loading…'}</p>
        </div>
      </div>`;
  }

  const embed =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}` +
    '?rel=0&iv_load_policy=3&playsinline=1';
  const long = video.description.length > 220;

  return `<div class="view watch" id="watch">
      <a class="back" href="/" data-link>Back</a>
      <div class="stage">
        <iframe
          src="${embed}"
          title="${esc(video.title)}"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen></iframe>
      </div>
      <h1 class="watch__title">${esc(video.title)}</h1>
      <div class="watch__actions">
        <p class="watch__meta">${esc(metaLine(video))}</p>
        <button class="btn" type="button" data-action="maximize" aria-pressed="false">Maximize</button>
      </div>
      <p class="watch__desc${long ? ' is-clamped' : ''}" id="description">${esc(video.description)}</p>
      ${long ? '<button class="link" type="button" data-action="expand" aria-expanded="false">More</button>' : ''}
    </div>`;
}

export type SearchView = {
  query: string;
  local: Video[];
  web: { items: Video[]; loading: boolean; failed: false | 'quota' | 'other' } | null;
};

export function search(state: State, view: SearchView) {
  const rows = (items: Video[]) =>
    items
      .map(
        (video) => `<a class="row${state.opened.has(video.id) ? ' is-seen' : ''}" href="/watch/${video.id}" data-link>
        <div class="thumb row__thumb"><img src="${esc(video.thumbnail)}" alt="" width="640" height="360" loading="lazy" decoding="async"></div>
        <div class="row__body">
          <h2 class="row__title">${esc(video.title)}</h2>
          <p class="card__meta">${esc(metaLine(video))}</p>
          <p class="row__desc">${esc(video.description)}</p>
        </div>
      </a>`,
      )
      .join('');

  const skeletons = Array.from(
    { length: 4 },
    () => `<div class="row" aria-hidden="true">
      <div class="thumb row__thumb skeleton"></div>
      <div class="row__body"><div class="line skeleton"></div><div class="line line--short skeleton"></div></div>
    </div>`,
  ).join('');

  const web = view.web;
  const failedText =
    web?.failed === 'quota'
      ? 'The daily search quota is used up. It resets at midnight Pacific.'
      : "Couldn't reach search. Check the connection and try again.";

  let count = '';
  let body: string;

  if (!view.query) {
    body = `<div class="empty"><p>Search for a topic, chapter or channel.</p></div>`;
  } else if (!web || web.loading) {
    count = 'Searching…';
    body = `<div class="rows" aria-busy="true">${skeletons}</div>`;
  } else if (web.failed) {
    body = view.local.length
      ? `<p class="note" role="status">${failedText} Showing what's saved on your topics.</p>
        <div class="rows">${rows(view.local)}</div>`
      : `<div class="empty"><p role="status">${failedText}</p></div>`;
  } else if (web.items.length === 0) {
    body = `<div class="empty">
        <p>No results for “${esc(view.query)}”.</p>
        <p class="note">Try a shorter phrase, like “gravitation” instead of the full chapter name.</p>
      </div>`;
  } else {
    count = `${web.items.length} ${web.items.length === 1 ? 'video' : 'videos'}`;
    body = `<div class="rows">${rows(web.items)}</div>`;
  }

  return `<div class="view page">
      ${view.query ? `<h1 class="search__title">${esc(view.query)}</h1>` : ''}
      ${count ? `<p class="search__count" role="status">${count}</p>` : ''}
      ${body}
    </div>`;
}

export function settings() {
  const choice = readTheme();
  const options: { id: 'light' | 'dark' | 'auto'; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'auto', label: 'Auto' },
  ];

  return `<div class="view settings">
      <h1>Settings</h1>

      <section class="section">
        <h2>Appearance</h2>
        <div class="segmented" role="group" aria-label="Theme">
          ${options
            .map(
              (option) =>
                `<button type="button" data-action="theme" data-theme="${option.id}" aria-pressed="${
                  choice === option.id
                }">${option.label}</button>`,
            )
            .join('')}
        </div>
      </section>

      <section class="section">
        <h2>Your topics</h2>
        <ul class="plain-list">
          ${app.topics.map((topic) => `<li>${esc(topic.label)}</li>`).join('')}
        </ul>
        <p class="note">Topics are set by the owner.</p>
      </section>

      <section class="section">
        <h2>About</h2>
        <p>${esc(app.appName)}</p>
        <p class="note">Version 1.0</p>
      </section>
    </div>`;
}
