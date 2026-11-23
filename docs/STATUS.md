# Status

Update at the end of every session. Loaded automatically each session.

## Current phase
Phases 1–3 built. Live data verified. Topics scoped to NEET/JEE study channels (2026-11-20).

## Done
- **Phase 1 — shell and look.** Vite + vanilla TS, one stylesheet with the SPEC §5.1 tokens,
  self-hosted Geist, pre-paint theme script, History API router (`/`, `/watch/:id`,
  `/search`, `/settings`), all four screens from fixtures, loading skeletons, empty, error,
  offline and opened-video states.
- **Phase 2 — live data.** One server function (`api/videos.ts`) for both endpoints, filters
  in `api/filters.ts` (duration parse, whole-word include/exclude, round-robin, dedupe),
  CDN caching, `localStorage` first paint, client-side refresh cooldown, scoped web search,
  fixtures as the no-key fallback.
- **Phase 3 — install and ship.** Manifest, 192/512/maskable icons, apple-touch icon, apple
  meta tags, `vercel.json` (SPA rewrite, CSP, referrer policy, nosniff, permissions policy,
  asset caching), `docs/SETUP.md`.
- Checks: `npm run typecheck` clean, `npm test` 20/20, `npm run lint:design` passes
  (all contrast pairs, no banned patterns), `npm run smoke` passes, `npm run shots` wrote
  24 screenshots to `docs/screens/`.
- Build: JS 5.83 kB gzip, CSS 2.94 kB gzip, Latin Geist 29.4 kB — inside budget.
- Built app served with the real `vercel.json` headers: no CSP violations on `/`,
  `/watch/:id`, `/search`, `/settings`.

## First live run (real key, 2026-11-20)

Verified against the real data API through the local function:

- 18 items per topic, `"source":"api"`, about 600–700 ms cold and cached afterwards.
- `Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400` on reads,
  `no-store` on `refresh=1`.
- Scoped search (`?topic=…&q=…`) returns 18 filtered results.
- Filters hold on real data: no Shorts, nothing under 3 minutes, nothing unembeddable.

Three bugs found and fixed by the live run:

- **Wrong API paths.** The handler called `/youtube/v3/search.list`, which 404s. Now
  `/search` and `/videos`, with a test that pins the paths.
- **HTML entities in titles.** `Gil Strang&#39;s Final Lecture` was shown raw. Added
  `decodeEntities()` and a test.
- **Descriptions were always the truncated search snippet**, so the "More" control could
  never appear. `videos.list` now asks for `snippet` too and the full description is used.
  Also fixed "36 months ago" → "3 years ago".

Content quality is the one thing left that code cannot fix; see `docs/PROPOSALS.md`.
Screenshots stay on fixtures on purpose (`scripts/harness.mjs` sets `YT_KEY=''`), so
`npm run shots` never spends quota.

## Topics changed to study channels (2026-11-20)

Owner decision: the app is now NEET/JEE study material only.

- Tabs, in order: **All, Physics, Organic Chemistry, Physical Chemistry, Inorganic
  Chemistry, Zoology, Botany**. Linear algebra and statistics are gone.
- A hard channel allowlist lives in `config/app.json` → `channels`:
  Physics Wallah, PW, PW NEET, Unacademy, Competition Wallah. Anything else is dropped
  before the details call, so a wrong channel never reaches the page.
- `include` now matches the **title only**, not the channel name. Otherwise every video
  from "Physics Wallah" would have counted as a physics video.
- Queries are `neet <subject> one shot`; plain `"physics lecture"` returned 1 usable video
  out of 50, the one-shot wording returns 12–24.

Live yields per topic, all from allowed channels: physics 18, organic chemistry 14,
physical chemistry 18, inorganic chemistry 16, zoology 18, botany 18.

Two UI issues found and fixed while checking:

- Seven tabs overflow on a phone; the active tab is now scrolled into view on render
  (it was off-screen entirely on a 390 px screen).
- `npm run smoke` failed once because `scripts/harness.mjs` left the preview server alive
  after each run (killing the shell, not the tree). It now kills the tree on Windows.

`docs/screens/live/topics-*.png` are the real feed; `docs/screens/` stays on fixtures.

## Deployed, and the 500 it threw (2026-11-20)

Live at `serein-yt.vercel.app`. The first deploy showed "Couldn't load your topics" on every
page, because `/api/videos` returned 500 `FUNCTION_INVOCATION_FAILED` for **every** request,
including one that should have answered 400 without touching the network. That means the
module crashed while loading, not while running.

Cause: `package.json` has `"type": "module"`, so Vercel runs the function as ESM, and the
handler imported two JSON files and one extensionless module:

- `import appConfig from '../config/app.json'` → ESM needs `with { type: 'json' }`
- `import { … } from './filters'` → ESM needs the `.js` extension

Reproduced exactly by transpiling the handler to ESM and importing it in plain Node:
`ERR_IMPORT_ATTRIBUTE_MISSING`, then `ERR_MODULE_NOT_FOUND`. Local `vite preview` never
showed it because Vite bundles the imports away.

Fixed by adding the import attributes and the `.js` specifier, and by moving the two test
files out of `api/` (Vercel would otherwise deploy them as public functions). Verified the
same way: the handler now imports and answers in plain Node ESM.

**Quota is the other failure mode.** `search.list` costs 100 units, so the free tier allows
about 100 searches a day; a full home load is six searches. Testing today ran it dry, and a
dried-up key answers `429`, which the handler turns into a per-topic 502. That is not fatal:
topics that loaded still render, with "Couldn't refresh. Showing what was saved at …".
Quota resets at midnight Pacific.

## Search found nothing (2026-11-20)

Symptom: type anything on the search page and get "Nothing found in your topics" even
though the home feed has videos.

Cause: the search screen only read `state.store` and never loaded anything. On a cold
visit — a deep link, a reload after the cache was cleared, or typing before the home
feed finished — the store was empty or partial, so local search had nothing to look in.
The smoke test missed it because it visited the home page first and waited for
`networkidle`, which filled every topic.

Fixed by making the search screen load the missing topics itself (the same `loadTopic`
path as home) and repaint, plus a real loading state: "Searching your topics…" while it
works, instead of claiming there is nothing. The query also keeps the selected topic when
you refine it from the search page.

Also: an exhausted quota now answers `503 {"error":"quota_exceeded"}` instead of a
generic 502, and the client says "The daily search quota is used up. It resets at
midnight Pacific." rather than blaming the connection. Test pins the 503.

Regression cover: `npm run smoke` now opens `/search?q=photosynthesis` in a **fresh
browser context** and requires rows, so the cold path stays fixed.

## Redesign and real search (2026-11-22)

- Redesign shipped: 64px bar, 48px tabs with a sliding underline, 2/3-column grid with
  18px titles, 34px watch title, 16px description at 72ch, 300px search rows, 40px
  settings headings, tracked uppercase section labels. Maximize (theater) button on the
  watch screen: top bar, 16:9 stage below it, Escape/backdrop/button to leave; the player
  UI is untouched.
- Search now sends the typed text straight to YouTube and shows the results as they are,
  with no channel or topic filter and no topic tabs. Verified live: `?q=gravitation`
  returned 20 `"source":"api"` items, relevance order.
- Feed recency: `publishedAfter` = now − 2 years and newest-first sort. Verified live:
  physics 15, zoology 18, botany 18; oldest April 2025, newest November 2026.
- Settings sits at the far right of the bar at every width.
- Checks: `typecheck` clean, `npm test` 21/21, `lint:design` passes, `smoke` passes
  (incl. cold `/search` and maximize), `shots` 30 files.

## Channels, community, wider layout (2026-11-22)

- Channel names on the watch screen link to `/channel/:id`, an in-app page of that
  channel's newest uploads with no filters beyond "can it play". Verified live.
- Home has a Refresh button next to the tabs; it refreshes the current topic or all
  topics, with the 60-minute cooldown and an honest message when it is not time yet.
- Community tab lists r/neetug, r/jeeneetards, r/neetards and r/neetprep.
- Layout: wordmark left, search centred, settings right; page max 1600px, 40px side
  padding, 4 columns at 1400px+. Search, channel and community pages use the same shell.
- Fixed a boot crash: the cache loop called `remember()` before `known` was initialised,
  which broke every page load once localStorage had a cached topic.
- Checks: `typecheck` clean, `npm test` 22/22, `lint:design` passes, `smoke` passes
  (refresh, channel page, community), `shots` 42 files.

## Community list, search blocklist, less empty (2026-11-22)

- Community now lists NEETard, ASKNEET, Neet_India, MEDICOreTARDS, JEENEETards,
  NEETdroppers2toppers, MBBSindia and MBBS_INDIA.
- Search drops titles matching `config/app.json` → `blocked` (Bigg Boss / BB / Bhabhi Ji
  and the Hindi spellings), whole-word and unicode-aware; tests cover English and Hindi.
- Home has a page header now: title, count line, tabs, Refresh. Same header on Community.
  Empty states got a title and a sentence, the feed closes on a hairline rule, and card
  thumbnails ease up 3% on hover. No shadows or gradients.
- Checks: typecheck clean, tests 22/22, lint:design passes, smoke passes, shots 42 files.

## Exam timer, resources, history, bar toggle (2026-11-22)

- Settings link replaced by a sun/moon toggle in the bar; the `/settings` route still
  exists but is no longer linked.
- NEET UG countdown in the bar, computed from `config/app.json` → `exam` (`2027-05-03`,
  which is 162 days from today). Recalculated on every render, so it is correct daily.
- Tabs now read subjects | Community · Resources · History. Resources lists the four
  links; History lists opened videos from `localStorage` (60 max, newest first).
- Checks: typecheck clean, tests 22/22, lint:design passes, smoke passes (toggle,
  resources, history, countdown), shots 54 files.

## Leaf logo (2026-11-23)

- Red leaf with white slits and a stem, drawn as `public/logo.svg` (vector, transparent),
  shown left of the wordmark in the bar. Used as the favicon and redrawn into the four PWA
  icons on the app background.
- The owner's attached reference was not readable from disk, so the mark is a hand-built
  vector recreation of it. If the original file is dropped at `public/logo-source.png`, the
  icons can be regenerated from it in one step.
- Checks: typecheck clean, tests 22/22, lint:design passes, smoke passes, shots regenerated.

## Apple-shaped UI, resume, daily line, search sort (2026-11-23)

- Home shows a **Continue watching** row (up to 3, from history) above the feed, on All only.
- One quiet line a day under the page title, picked by date from a 10-line list in `views.ts`.
- Search has a **Relevance / Newest** segmented control (`?sort=newest` → YouTube `order=date`),
  and the in-memory search cache key includes the sort.
- UI restyled toward Apple: segmented pill tabs, pill buttons and search field, 40px page
  titles, grouped-list Community/Resources with chevrons, hairline blocks, 16px body text,
  wider spacing. No shadows or gradients, so `lint:design` still passes unchanged.
- Checks: typecheck clean, tests 22/22, lint:design passes, smoke passes (sort, continue
  watching, daily line), shots regenerated.

## Watch deep links fixed (2026-11-23)

- The watch screen asked for **every topic** (6 searches, 600 units) to resolve one id, then
  gave up, so a video opened from search, a channel page, or a reload showed
  "isn't in your topics" even when it was fine. It now asks for that one video
  (`/api/videos?v=<id>`, one `videos.list`, 1 unit) and only says "This video can't play
  here" when the API returns nothing: removed, private, unembeddable, or blocked.
- Smoke covers a deep link that is not in the topic cache.
- Motion polish: tabs cross-fade their pill, cards lift 2px on hover. No shadows or gradients.

## Next
1. Owner opens `https://serein-yt.vercel.app` on the iPad, adds it to the Home Screen and
   reports what actually happens.
2. If a topic shows "Couldn't refresh" during the day, the daily search quota is spent;
   it resets at midnight Pacific.

## Blockers
- None.

## Unverified (needs the real iPad or real API; do not claim these work)
- Playback in the official embed on the iPad, under the final CSP and with the service
  blocked in NextDNS. The embed loads and is correctly configured here, but this machine
  blocks `youtube-nocookie.com`, so the player itself was never seen playing.
- Real thumbnails: this machine also blocks `i.ytimg.com` (`ERR_NETWORK_ACCESS_DENIED`), so
  no live thumbnail has rendered. The 4:3 → 16:9 crop is therefore still unverified, and
  the live screenshots in `docs/screens/live/` show empty image boxes for that reason.
- Standalone (Home Screen) behaviour: storage, fullscreen video, status bar, safe areas.
- Real WebKit/Safari rendering. Screenshots and smoke tests run in system Edge.
- Accessibility beyond contrast: no axe pass was run (see `docs/DECISIONS.md`).
- The Vercel function has not been deployed; only the local Vite middleware was exercised.
  The `vercel.json` CSP was verified by serving the built app with those exact headers.

## Session log
- 2026-11-20 — Built phases 1–3 end to end, wrote `docs/PLAN.md`, `docs/SETUP.md`,
  fixed the settings column alignment and the shots script's lazy-image wait, verified the
  build under the real CSP, initialised the repo.
- 2026-11-20 — First live run with a real key. Fixed the wrong API paths (`search.list`
  404), HTML entities in titles, truncated descriptions, and the months/years label.
  Screenshots and smoke now pin `YT_KEY=''` so they stay deterministic and quota-free.
