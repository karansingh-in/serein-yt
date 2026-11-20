# Serein (simple video app) - agent rules

A fast, calm, installable web app (PWA) for one person on an iPad. It shows videos only from topics the owner chooses, played in YouTube's official embedded player. Simpler than YouTube on purpose: no comments, no recommendations, no Shorts, no accounts, no notes.

## Read order, every session
1. `docs/STATUS.md` (also auto-loaded).
2. `docs/SPEC.md` for the part you are working on. It is the source of truth.
3. `docs/DECISIONS.md` before adding a dependency or changing an approach.

## Working agreement
- Work in the phases in SPEC section 8. Stop at the end of each phase, report with the check results and screenshot paths, and wait for approval.
- Do not add features that are not in the SPEC. Put ideas in `docs/PROPOSALS.md`.
- Before saying anything is done, run and report: `npm test`, `npm run lint:design`, `npm run check:contrast`, `npm run check:size`, `npm run shots`. Fix failures or say plainly that they fail.
- Be honest about what is untested. You cannot run Safari on a real iPad; anything that depends on it goes under "Unverified" in `docs/STATUS.md`. Never write "works on iPad" unless the owner confirmed it.
- End every session by updating `docs/STATUS.md` (done / next / blockers / unverified) and committing. Small commits.
- Ask questions in one batch, only when the SPEC does not answer them. Be direct and concise; push back with reasons, then follow the owner's decision.
- If `design/stitch/` exists, it is a visual reference only. The tokens and rules in the SPEC win. Do not copy its code (Tailwind, gradients, shadows, icon fonts).

## Stack (decided)
Vite + vanilla TypeScript, no UI framework. Plain CSS with custom properties. Vitest for unit tests. Playwright for screenshots (Chromium and WebKit) and axe accessibility checks. Zero runtime dependencies if possible; every runtime dependency needs a line in `docs/DECISIONS.md`. Font: `@fontsource-variable/geist`, self-hosted, Latin subset only.

## Reuse from the earlier prototype
An earlier prototype lives at `<OLD_PROJECT_PATH>` (the owner will fill this in). You may copy and adapt from it: `scripts/` (lint-design, check-contrast, check-size, shots, a11y), the self-hosted font setup with fallback metrics (Geist only now), the pre-paint theme script, and the History API router. Do not copy its screens, fixtures, notes or worker plans. If the path is missing, build these from the SPEC.

## Hard rules
- Privacy: no analytics, trackers, third-party scripts, fonts or CDNs. The only hosts the client may contact: its own origin, `www.googleapis.com` (data), `i.ytimg.com` (thumbnails), `www.youtube-nocookie.com` (player).
- Keep `Referrer-Policy: strict-origin-when-cross-origin` and `referrerpolicy` on the iframe (embeds without a referrer fail with error 153).
- YouTube rules: official API and official embedded player only. Never remove, skip, block or hide ads. Never scrape, proxy or download streams, never use unofficial endpoints, never paint over or hide the player's own UI, never alter its branding.
- Never use "YouTube", "YT" or any derivative in the app name. The name comes from `config/app.json` (`appName`).
- The API key is public by nature (it ships in the client). It must be restricted in Google Cloud to the site's origin and to YouTube Data API v3. Read it from `VITE_YOUTUBE_API_KEY`; never commit a real key.
- Design restrictions in SPEC section 5.6 are enforced by `npm run lint:design`. Do not weaken the linter to make code pass.
- Do not run `/init`. Do not invent real video data; use clearly labelled fixtures under `web/fixtures/`.
