# Plan

Phases from `docs/SPEC.md` §8, with the decisions taken in this build.

## Phase 1 — shell and look

- [x] Vite + vanilla TS, one stylesheet, tokens from SPEC §5.1
- [x] Geist self-hosted, pre-paint theme script (no inline script, CSP-safe)
- [x] History API router: `/`, `/watch/:id`, `/search`, `/settings`
- [x] Home, Watch, Search, Settings rendered from fixtures
- [x] States: loading skeletons, empty, error, opened-video dimming
- [x] `scripts/lint.mjs` (banned patterns + contrast), `scripts/shots.mjs`
- [x] Screenshots at 1180×820, 820×1180, 390×844, light and dark

## Phase 2 — live data

Plan, then the ponytail pass that changed it:

| Planned | Ponytail verdict | Built |
|---|---|---|
| Runtime `config/app.json` fetch | One endpoint, one loading state, one error path for a file that changes monthly. Owner deploys from the repo. | **Cut.** Config is imported at build time. |
| Separate `cache.ts` module with TTL + SWR tests | The CDN already caches the response. Two caches need two invalidation stories. | **Cut.** `s-maxage` on the function, `localStorage` only for instant first paint. |
| KV namespace for the cache | Adds a binding, a client, a dependency and a second expiry. | **Cut.** Vercel CDN + `Cache-Control`. |
| Client-side filter pipeline | Filters must run server-side anyway or the client needs the raw API shape. | **Cut.** One implementation in `api/filters.ts`, tested. |
| Server-side round-robin | Needs all topics in one request, so `homeTotal` and `perTopic` fight. | **Kept client-side.** `interleave()` in `api/filters.ts`, shared and tested. |
| Manual refresh with server-side rate limit | Needs state. There is one user. | **Client cooldown** in `localStorage`, 60 min. |
| Offline state | Not free, but it is a SPEC requirement. | **Built** — `navigator.onLine` + `offline`/`online` events. |

Remaining work in this phase:

- [x] `api/filters.ts` (duration parse, whole-word include/exclude, round-robin, dedupe) + 9 tests
- [x] `api/videos.ts` — one handler, both endpoints, fixtures when `YT_KEY` is absent
- [x] `vercel.json` — SPA rewrite, CSP, referrer policy
- [x] Vite dev and preview middleware mounting the same handler
- [x] `localStorage` cache, stale-while-revalidate, refresh cooldown
- [x] Opened-video dimming, scoped web search
- [x] Offline state
- [x] `YT_KEY` in `.env.example` (the old `VITE_YOUTUBE_API_KEY` is dead)
- [x] Handler test with a stubbed `fetch`

## Phase 3 — install and ship

| Planned | Ponytail verdict | Built |
|---|---|---|
| `check:size` script | The build output already prints gzip sizes; a script that greps them adds nothing. | **Cut.** Budget checked from the build log. |
| axe accessibility pass | Playwright's axe needs another dependency and a real browser. | **Cut** for now; focus states and labels are built in. Named as a gap. |
| WebKit screenshots | Requires a browser download. | **Cut.** Chromium via system Edge. Noted as unverified. |
| Service worker | SPEC forbids it. | Not built. |
| `_headers` file | Vercel does not read `_headers`. | **Replaced** by `vercel.json` headers. |

Remaining work in this phase:

- [x] Manifest, 192/512/maskable icons, apple-touch icon, apple meta tags
- [x] CSP, referrer policy, nosniff, permissions policy in `vercel.json`
- [x] `docs/SETUP.md` — key restriction, deploy, NextDNS, Screen Time, Add to Home Screen
- [x] `docs/STATUS.md`, `docs/DECISIONS.md` updated
- [x] Verify the built app under the real CSP

## Phase 4 - offline and quota (proposed 2026-11-24)

Owner asked what to improve besides the look. Three things, in value order. Each is its
own stop-and-report step.

**SPEC conflict, needs an owner decision.** SPEC 6 says "No service worker." and
DECISIONS line 10 gives the reason: stale-cache bugs, and the app needs a connection
anyway. Phase A below needs that one sentence amended. A service worker cannot make the
*player* work offline - the player lives on `youtube-nocookie.com` - it only makes the
app open and show what was saved.

### A. App shell offline (~25 lines, no dependency)

| Piece | Change |
|---|---|
| `public/sw.js` (new) | Cache-first for same-origin assets, network-first for navigations with the cached shell as fallback, never touches `/api/`. No build step and no file list: whatever the first visit loaded is what offline gets. One version constant, used only to drop old caches. |
| `src/main.ts` | Register on `load`, production only, `navigator.serviceWorker` guarded. Six lines. |
| `vercel.json` | `/sw.js` gets `Cache-Control: no-cache`, so an update is picked up on the next load. |
| `scripts/smoke.mjs` | Load once, go offline, open `/search`: expect the shell and the offline line, not the browser's error page. |
| `docs/SPEC.md`, `docs/DECISIONS.md` | The amended sentence and the new reason. |

Skipped: caching thumbnails or API JSON in the worker. Thumbnails are cross-origin
opaque responses that inflate the storage quota; API JSON is already handled by the
client, and caching it in the worker would make the Refresh button a lie.

### B. Stop paying 100 quota units for the same search (~25 lines)

Today only topics survive a reload. Search, a channel page and a single video are
memory-only, so a reload spends quota again.

| Piece | Change |
|---|---|
| `src/api.ts` | `readSaved`/`writeSaved` over the existing cache helpers, one prefix, pruned to the newest 8 entries at boot so a full `localStorage` cannot starve the topic cache. |
| `src/main.ts` | Seed search, channel and single-video state from it before fetching; write it on success. Reuses `isStale`, `readCache`, `writeCache`. |
| `scripts/smoke.mjs` | Search once, reload, search the same text again with the network blocked: rows must still render. |

### C. Resume where the player stopped - needs a second decision

`start=` is enough to resume, but nothing tells the app where you were without
`enablejsapi=1` and reading `postMessage`, and SPEC 7 says "No iframe API and no scripts
from YouTube". So this is a SPEC amendment too, not a bug fix: about 40 lines, one
`message` listener, the position stored on the existing history entry.

Value: real for a 50-minute one-shot. Risk: the embed then needs an `origin` parameter,
and the `infoDelivery` message shape is undocumented, so it can change without notice.

**Cut from this plan:** `/api/health` (the error messages already say why), thumbnail
`srcset` (SPEC 7 pins one thumbnail size), keyboard shortcuts (not in the SPEC), a
Vercel cron warming topics (one more moving part for a quota of 10,000 units a day),
visual-regression CI (there is no CI).

### Checks per phase

`npm run typecheck`, `npm test`, `npm run lint:design`, `npm run smoke`, `npm run shots`,
then `docs/STATUS.md`. Offline behaviour is Chromium-only here; the iOS Home Screen
stays unverified.
