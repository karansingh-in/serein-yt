# Status

Update at the end of every session. Loaded automatically each session.

## Current phase
Phases 1–3 built. Waiting for owner review and a real `YT_KEY`.

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
- Checks: `npm run typecheck` clean, `npm test` 13/13, `npm run lint:design` passes
  (all contrast pairs, no banned patterns), `npm run smoke` passes, `npm run shots` wrote
  24 screenshots to `docs/screens/`.
- Build: JS 4.96 kB gzip, CSS 2.94 kB gzip, Latin Geist 29.4 kB — inside budget.
- Built app served with the real `vercel.json` headers: no CSP violations on `/`,
  `/watch/:id`, `/search`, `/settings`.

## Next
1. Owner reviews the screenshots in `docs/screens/` and the app at 820×1180 and 1180×820.
2. Owner adds a real `YT_KEY` and deploys to Vercel per `docs/SETUP.md`; check that
   `/api/videos?topic=linear-algebra` returns `"source":"live"`.
3. Owner installs it on the iPad and reports what actually happens.

## Blockers
- No real `YT_KEY`, so no live call to the data API has ever been made from this build.

## Unverified (needs the real iPad or real API; do not claim these work)
- Live `search.list` / `videos.list` calls, quota use, and the shape of real responses.
- Playback in the official embed on the iPad, under the final CSP and with the service
  blocked in NextDNS.
- Standalone (Home Screen) behaviour: storage, fullscreen video, status bar, safe areas.
- Whether the 4:3 `high` thumbnails crop cleanly to 16:9 on real data (fixtures are 16:9).
- Real WebKit/Safari rendering. Screenshots and smoke tests run in system Edge.
- Accessibility beyond contrast: no axe pass was run (see `docs/DECISIONS.md`).
- The Vercel function has not been deployed; only the local Vite middleware was exercised.

## Session log
- 2026-11-20 — Built phases 1–3 end to end, wrote `docs/PLAN.md`, `docs/SETUP.md`,
  fixed the settings column alignment and the shots script's lazy-image wait, verified the
  build under the real CSP, initialised the repo.
