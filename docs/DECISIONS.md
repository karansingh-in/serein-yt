# Decisions

Record every dependency, deviation from SPEC.md, and adjusted design token, with one line of reasoning and the date.

## Decided before development
- Vite + vanilla TypeScript, no framework. Reason: speed and a hand-tuned calm interface.
- One font family (Geist). Reason: simpler, smaller, and a clean neutral look.
- Static app, API called from the browser with a restricted key and local cache. No server. Reason: simplicity for a single user; the owner accepts that the key is visible in the client.
- Search is `search.list` (100 units per call), so every topic result is cached and refreshes are rate limited. Reason: free quota.
- No service worker; manifest and icons only. Reason: avoids stale-cache bugs; the app needs a connection anyway.
- Ads cannot be removed with the official player. Reason: YouTube policy; do not attempt workarounds.
- App name is configurable and must not contain "YouTube" or "YT". Reason: YouTube API Branding Guidelines.

## Deviations taken during the build
- **API calls moved to one server function** (`api/videos.ts`) instead of the browser. Reason: the key stays private, filters run once on the server, and the CDN caches the answer. Consequence: the key needs the API restriction only, not an HTTP-referrer restriction, and the CSP `connect-src` no longer needs `https://www.googleapis.com`. SPEC §7 still lists it; leaving it out is stricter and intentional.
- **No KV or database.** The CDN's `s-maxage` is the cache. Reason: one user, one cache, one expiry.
- **`config/app.json` is imported at build time**, not fetched at runtime. Reason: one file that changes monthly, and one less loading state.
- **`fixtures/videos.json` at the repo root**, not `web/fixtures/`. Reason: one handler reads it on the server; it is not part of the client bundle.
- **Icons are rendered with Segoe UI Bold, not Geist.** Reason: no headless font pipeline was installed. At 192 px and below the difference is invisible; revisit if the icon set is regenerated.
- **`vercel.json` headers instead of `_headers`.** Reason: Vercel ignores `_headers`.
- **Checks cut to `typecheck`, `test`, `lint:design`, `smoke`, `shots`.** Reason: `check:size` duplicates the build log, and axe plus WebKit need browser downloads that were not allowed. Accessibility is covered by the contrast check, labels and focus styles; it is listed as a gap, not as done.
- **`.zip` archives of the source material are git-ignored.** Reason: binary copies of files already in the repo.
- **`videos.list` also asks for `snippet`.** Reason: `search.list` truncates descriptions, so the watch screen could never offer "More". Same quota cost.
- **Screenshots and smoke tests pin `YT_KEY=''`** (`scripts/harness.mjs`). Reason: deterministic output and no quota spent on every visual check. Live runs use a separate preview with the real key.
- **Thumbnails stay on the API `high` size with `object-fit: cover`.** Reason: SPEC §7. It is 480×360 (4:3) and `cover` crops the letterbox bars; unverified here because this machine blocks `i.ytimg.com`.
- **Channels are an allowlist, not a query hint** (`config/app.json` → `channels`). Reason: the owner asked for study channels only; a search cannot express that, and a hard filter means a wrong channel can never reach the page. Trade-off: a topic is only as full as its channel coverage, so `maxResults` went from 25 to 50. Note: SPEC §3 still lists the original topics; `config/app.json` is now the source for topics and channels.
- **`include` matches the title only.** Reason: with a channel allowlist, matching the channel name would make every "Physics Wallah" video pass every subject filter.
- **Topic queries use the `neet … one shot` wording.** Reason: measured. `"physics lecture"` yielded 1 usable video of 50; `"neet physics one shot"` yielded 24.
- **The function must be valid ESM on its own** (`with { type: 'json' }`, `./filters.js`). Reason: `"type": "module"` makes Vercel run it as ESM, where JSON needs an import attribute and relative imports need an extension. Local Vite hid this by bundling. Cost of ignoring it: every request 500s.
- **Tests live in `tests/`, not `api/`.** Reason: Vercel turns every file in `api/` into a public function, including test files.
- **The search screen loads the topics it needs.** Reason: local search can only read cached topics, so a cold deep link had nothing to search and said "Nothing found". Cost: a cold `/search` can trigger the same six topic fetches as home; they are CDN-cached.
- **Quota exhaustion answers `503 quota_exceeded`, not `502`.** Reason: Google's 429 is a wait, not a fault; the client can say so instead of blaming the connection.

## Search and feed changes (2026-11-22)

- **Search is a raw YouTube search** (`?q=`), not a local or topic-scoped one. Reason: the owner searched "gravitation" and got nothing, because search only looked inside the cached NEET topics. Now `api/videos.ts` calls `search.list` with the typed text, no channel/topic rules and `safeSearch=none`, then only drops videos that cannot play in the embed. Trade-off: search can return anything, including non-study videos; that was the owner's explicit call. Cost: one `search.list` per new query, cached for an hour at the CDN.
- **The search screen no longer has topic tabs or a web-search link.** Reason: those only made sense when search was limited to a topic.
- **The feed is capped to the last two years and sorted newest first.** Reason: every card was 4-7 years old. `publishedAfter` is computed as `now - 730 days`, and the kept list is sorted by `publishedAt` before `perTopic` is applied. Relevance order is kept in the request so the pool stays full; the sort then puts the newest of that pool first. Measured after the change: physics 15, zoology 18, botany 18, oldest April 2025.
- **Settings moved to the far right of the bar** (`margin-left: auto`). Reason: the search well is capped at 540px, so the link used to sit mid-bar.

## Channels, community and a wider feed (2026-11-22)

- **Channel names are links** (`/channel/:id`). The page reads the channel's uploads playlist (`channels.list` + `playlistItems.list` + `videos.list`, 3 units), newest first, with no channel allowlist, topic rules or duration filter; only unplayable videos are dropped. Verified live after deploy.
- **Every fetched video is kept in a memory map** (`known`), so a video opened from search or a channel page always plays instead of "isn't in your topics".
- **Feed refresh button** in the tab row. It refreshes the visible topic, or all topics on All, and respects the existing 60-minute cooldown per topic; when everything is on cooldown it says so instead of pretending. A full refresh is six `search.list` calls (600 units).
- **Community tab** next to the subjects, linking r/neetug, r/jeeneetards, r/neetards and r/neetprep in a new tab. Links live in `config/app.json` → `community`.
- **Layout widened to YouTube's shape**: bar is a 3-column grid (wordmark left, search centred at up to 620px, settings right), page max width 1600px with 40px side padding, grid gaps tightened to 44/24, and a fourth column at 1400px+. No shadows or gradients were added.
