# Serein - spec

## 1. What it is
A simpler, calmer, faster video app for one person on an iPad, installed to the Home Screen. It shows videos only from topics the owner chooses (config file), plays them in YouTube's official embedded player, and has nothing else: no comments, recommendations, Shorts, accounts, notes, sets or sessions. Every screen ends.

The owner blocks youtube.com with NextDNS and holds the iPad's Screen Time passcode. NextDNS allows `youtube-nocookie.com`, `googlevideo.com` and `ytimg.com`. This app is the allowed way to watch.

## 2. Verified facts and honest limits
| Fact | Consequence |
|---|---|
| Embedded videos show ads according to each creator's settings. Premium does not reliably remove them in embeds (it needs a signed-in account, and Safari tracking prevention can treat the embed as signed out). | The app cannot be ad-free. Do not try to remove, skip, block or hide ads. Do not proxy or scrape. Nothing in the UI may promise "ad-free". |
| YouTube API Branding Guidelines forbid "YouTube", "YT" or derivatives in an app's name. | App name comes from `config/app.json`. Default "Serein". The owner may change it at his own risk (API access can be revoked). Do not use YouTube logos or the play icon. |
| `search.list` costs 100 quota units; default quota is 10,000 units per day. `videos.list` costs 1. | Cache every topic for `cacheHours`, rate-limit manual refresh, never search on every keystroke. |
| `rel=0` limits end-of-video suggestions to the same channel but cannot disable them. The embed shows a "More videos" overlay on pause that no parameter removes. | Accept it. Do not cover or modify the player. |
| Embeds without a referrer fail (error 153). | Keep the referrer policy and the iframe `referrerpolicy`. |

Unverified, to confirm on the real iPad and record in STATUS.md: browser calls to `www.googleapis.com` with a referrer-restricted key; that host reachable under the owner's NextDNS; playback under the final CSP; Home Screen behaviour (storage, fullscreen, status bar); clean 16:9 cropping of 4:3 thumbnails.

## 3. Topics (the only source of content)
`config/app.json` holds `appName`, `topics[]` and `limits`. A topic: `id`, `label`, `query`, `include[]` (any must match), `exclude[]`, `categoryId` (optional, "27" is Education), `duration` (`any|medium|long`), `order` (`relevance|date`), `language`.

Fetch per topic:
1. `search.list` with `part=snippet&type=video&q=<query>&videoEmbeddable=true&videoSyndicated=true&safeSearch=moderate&maxResults=25`, plus `relevanceLanguage`, `videoCategoryId`, `videoDuration`, `order` from the topic.
2. `videos.list?part=contentDetails,status&id=<ids>` (one call, up to 50 ids) for duration and `embeddable`.
3. Keep a video only if: embeddable, not live or upcoming, duration >= `minDurationSec` (default 180, drops Shorts), title or channel matches `include` (whole word, case-insensitive; empty list means no requirement), and does not match `exclude`.
4. Cap at `perTopic`. De-duplicate across topics.

Home "All" interleaves topics round-robin (so one topic cannot dominate), capped at `homeTotal`, then ends with the end line. A topic tab shows only that topic.

Cache: `localStorage` per topic, TTL `cacheHours` (default 6). Stale-while-revalidate: show cached content immediately and refresh in the background when stale. A quiet text link "Refresh" is allowed at most once per `manualRefreshMinutes` per topic. If the API fails or quota is exceeded, show what is cached with "Couldn't refresh. Showing what was saved at 14:05." Quota maths for the docs: topics x (24 / cacheHours) x 100 units per day.

Opened videos are remembered locally and shown dimmed (`--text-2`) in feeds. Nothing else is tracked.

## 4. Screens
1. **Home.** Top bar 72px: wordmark (the `appName`, text only, no logo, no icon) at left, then a search field (44px tall, radius 10, hairline border, placeholder "Search your topics"), then a "Settings" text link at right. Hairline under the bar appears only after scrolling. Below: topic tabs as plain text (All, then each topic), 44px tall, active tab has a 2px accent underline; horizontally scrollable on phone with no scroll arrows. Then the video grid (3 columns at 1000px+, 2 at 600-999, 1 below; column gap 32, row gap 56). Card: 16:9 thumbnail (radius 12), 12px gap, title (17px, weight 500, max 2 lines), meta line (13px, `--text-2`): "Channel name, 24 min, 3 days ago" using words not symbols if a separator is needed. No overlays on the thumbnail, no avatars, no counts. Ends with "That's everything on your topics."
2. **Watch.** Back text link top-left. Centred 16:9 player stage (max 1100 wide) with generous space above and below. Under it: title (28px, weight 600, line height 1.2), meta line, description clamped to 3 lines with a "More" text link. Nothing else: no comments, no related videos, no sidebar, no share or like.
3. **Search.** Local results first (title and channel from cached topics, instant, no quota). A topic selector (tabs). If a single topic is selected, a text link "Search this topic on the web" runs one `search.list` for `<text> <topic query>` through the same filters (counts against quota, rate limited). Results as rows: 16:9 thumbnail (280px wide) at left, title, meta, two-line description at right. Empty state: "Nothing found in your topics."
4. **Settings.** Theme (Light, Dark, Auto as a text segmented control). "Your topics" read-only list (topics are edited in `config/app.json`, so the viewer cannot widen them). About: app name and version.
States for every screen: loading, empty, error, offline ("You're offline. Showing what was saved.").

## 5. Design system
Goal: feels designed with Apple-level craft (restraint, spacing, motion, precision) without imitating iOS components, SF fonts or system UI.

### 5.1 Tokens (`web/src/styles/tokens.css` is the only place colours and families are defined)
```css
:root {
  color-scheme: light;
  --bg: #F5F4F0; --surface: #FBFAF7;
  --text-1: #141413; --text-2: #5C5B57; --text-3: #6F6D67; /* hints; keep AA */
  --hairline: rgba(20, 20, 19, 0.10);
  --accent: #23483C; --accent-ink: #F5F4F0;
  --scrim: rgba(15, 15, 14, 0.55);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0F0F0E; --surface: #171716;
  --text-1: #EDEBE6; --text-2: #A3A09A; --text-3: #8A8782;
  --hairline: rgba(237, 235, 230, 0.10);
  --accent: #9CC4B3; --accent-ink: #0F0F0E;
  --scrim: rgba(0, 0, 0, 0.6);
}
```
Theme is `light | dark | auto`, set by an external pre-paint script (no inline script, CSP) to avoid a flash. `npm run check:contrast` must pass WCAG AA for every text pair. The accent appears only on the active topic tab underline, the one primary action on a screen, and focus rings. No status colours, no red.

### 5.2 Type
Geist Variable only, weights 400, 500, 600, tabular numerals for times. Scale (px): 13, 15, 17, 22, 28, 34. Wordmark 22/600, letter-spacing -0.02em. Titles letter-spacing -0.01em. Body line height 1.5, titles 1.3, headings 1.2. Sentence case everywhere. Fallback stack `"Geist Variable", system-ui, "Segoe UI", Roboto, Arial, sans-serif` with metric overrides so no layout shift. Preload the font file.

### 5.3 Space and shape
Base 4px; allowed values 4, 8, 12, 16, 24, 32, 48, 72, 112. Page margins 20 (<600), 40 (600-999), 72 (1000+); content max 1120. Left-aligned, ragged-right. Use `dvh` and `env(safe-area-inset-*)`, never `100vh`. Touch targets at least 44x44. Thumbnails radius 12, controls radius 10. Hairlines 1px. No shadows.

### 5.4 Motion
`--ease: cubic-bezier(0.22, 1, 0.36, 1)`; press 120ms (opacity 0.7), reveal 200ms, shared 320ms. Only `transform` and `opacity`. No bounce. Page change: fade plus 4px rise, 180ms. First render of Home: cards fade up 6px with a 30ms stagger, first 8 only, once per session; cached revisits render instantly. Opening a video: thumbnail expands to the player stage via View Transitions where supported, else crossfade. Loading: flat blocks at final dimensions pulsing opacity 0.6 to 1 over 1.6s (no shimmer, no gradients). `prefers-reduced-motion`: opacity only.

### 5.5 Voice
Calm, plain, specific. Sentence case, no exclamation marks, no emoji. Examples: "That's everything on your topics." "Nothing new today." "You're offline. Showing what was saved." "Couldn't refresh. Showing what was saved at 14:05."

### 5.6 Restrictions (enforced by `scripts/lint-design.mjs`; fail the build)
Forbidden in CSS, HTML and TS strings: `gradient(`, `box-shadow`, `text-shadow`, `drop-shadow`, `backdrop-filter`, `filter: blur`, emoji, colours or `font-family` outside tokens, `!important` (except reduced motion), `transition: all`. Also forbidden: cards inside cards, carousels, infinite scroll, badges, pills, icon-in-circle, illustrations, counters, view or like counts, toasts for routine actions, uppercase labels. Icons: one thin-stroke search icon, nothing else unless text is unclear. One primary action per screen, verbs for buttons.

## 6. Install as an app (PWA)
Web app manifest: `name`/`short_name` from `appName`, `display: standalone`, `start_url: /`, `background_color` and `theme_color` matching tokens (light and dark via media), icons 192, 512, maskable 512, plus `apple-touch-icon` 180. Meta: `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, viewport with `viewport-fit=cover`. Icon: solid accent square with a lowercase letter from the app name in Geist; no leaf, no play button, no YouTube marks. A service worker caches the app shell only (same-origin pages and assets); it must never cache `/api/` responses, so Refresh always reaches the network. It cannot make the player work offline. Document the Add to Home Screen steps in SETUP.md. Note: a Home Screen app has its own storage, so its first launch starts with an empty cache.

## 7. Performance and security
Budget: JS <= 40 KB gzip, CSS <= 10 KB gzip, font file <= 35 KB. Thumbnails: `loading="lazy"`, `decoding="async"`, fixed aspect-ratio boxes (no layout shift), use the API `high` thumbnail with `object-fit: cover` to crop its letterbox bars to 16:9 (verify visually). First paint from cache, instantly.
`_headers`: CSP `default-src 'self'; img-src 'self' https://i.ytimg.com data:; frame-src https://www.youtube-nocookie.com; connect-src 'self' https://www.googleapis.com; script-src 'self'; style-src 'self'; font-src 'self'`; `Referrer-Policy: strict-origin-when-cross-origin`; `X-Content-Type-Options: nosniff`. Player iframe: `https://www.youtube-nocookie.com/embed/<id>?rel=0&iv_load_policy=3&playsinline=1`, `referrerpolicy="strict-origin-when-cross-origin"`, `allow="autoplay; fullscreen; picture-in-picture"`, `allowfullscreen`, `title`. Autoplay only when started by a tap. No iframe API and no scripts from YouTube.

## 8. Phases (stop at the end of each)
**Phase 1, design shell.** Scaffold, tokens, Geist, shell and router, theme, Home / Watch / Search / Settings from fixtures with all states, copied or rebuilt check scripts, screenshots. Fixtures must include loud, saturated, text-heavy 16:9 thumbnails (locally generated or CC0, no real channel imagery) so the design is tested against realistic YouTube thumbnails.
**Phase 2, live data.** Config loader, YouTube client (`search.list`, `videos.list`), filters, round-robin merge, cache with stale-while-revalidate, rate-limited refresh, opened-video dimming, scoped search, error and offline states, unit tests (filters, duration parsing, merge, cache TTL, quota-safe refresh). Fixtures remain as a fallback when no key is set. Report whether the browser call works (CORS, referrer-restricted key).
**Phase 3, install and ship.** Manifest, icons, meta tags, `_headers`, `docs/SETUP.md` (create and restrict the API key; deploy as a static site, for example Cloudflare Pages; NextDNS: block the YouTube service with a Recreation Time schedule, Allowlist `youtube-nocookie.com`, `googlevideo.com`, `ytimg.com`, add `www.googleapis.com` if it turns out to be blocked, Denylist `mask.icloud.com`, `mask-h2.icloud.com`, `mask-canary.icloud.com`; Screen Time passcode held by the owner, block the YouTube app, disallow installing and deleting apps; Add to Home Screen). Mark anything untested. State that a NextDNS profile can be removed on the device, so Screen Time is the real lock.

## 9. Definition of done
Checks: `npm test`, `npm run typecheck`, `npm run lint:design`, `npm run check:contrast`, `npm run check:size`, `npm run shots` (Chromium and WebKit at 820x1180, 1180x820, 390x844, light and dark, every screen and state, into `docs/screens/`), `npm run a11y` (axe: no serious or critical issues; visible focus ring on everything interactive; text scales). Each phase is done when its checks pass, STATUS.md is updated, and the owner approves.

## 10. Out of scope
Ad blocking or removal, accounts or sign-in, Premium handling, comments, recommendations, Shorts, live streams, channel pages, subscriptions, notes, study sets, sessions, downloads, custom player controls, notifications, analytics, any other site, an in-app topic editor.
