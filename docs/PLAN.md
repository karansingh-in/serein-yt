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
