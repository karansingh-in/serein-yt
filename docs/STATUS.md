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
- Checks: `npm run typecheck` clean, `npm test` 19/19, `npm run lint:design` passes
  (all contrast pairs, no banned patterns), `npm run smoke` passes, `npm run shots` wrote
  24 screenshots to `docs/screens/`.
- Build: JS 5.60 kB gzip, CSS 2.94 kB gzip, Latin Geist 29.4 kB — inside budget.
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

## Next
1. Owner reviews the screenshots in `docs/screens/` and the app at 820×1180 and 1180×820.
2. Owner adds a real `YT_KEY` and deploys to Vercel per `docs/SETUP.md`; check that
   `/api/videos?topic=physics` returns `"source":"live"`.
3. Owner installs it on the iPad and reports what actually happens.

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
