# Setup

Everything here is done once, by the owner. Nothing in this file is automated.

## What runs where

- The app is static files (`dist/`) on Vercel.
- One server function, `api/videos.ts`, serves `/api/videos` and holds the API key. It is
  the only thing that talks to Google, and it caches its answer at the CDN (`s-maxage`).
- The browser only contacts its own origin, `i.ytimg.com` (thumbnails) and
  `www.youtube-nocookie.com` (player). The CSP in `vercel.json` enforces this.

## 1. Create the API key

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. **APIs & Services → Library → YouTube Data API v3 → Enable.**
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Edit the key → **API restrictions → Restrict key → YouTube Data API v3.** Save.
5. Do **not** add a website (HTTP referrer) restriction. The key is used by the server
   function, not the browser, so a referrer restriction makes every call fail. An IP
   restriction is also impractical because Vercel functions do not have fixed outbound IPs.
   The key is safe because it never ships to the client; keep it out of git.

Free quota is 10,000 units per day. One topic refresh costs about 100 units for
`search.list` plus 1 for `videos.list`, so the cooldown in `config/app.json`
(`limits.manualRefreshMinutes`) is what keeps this cheap.

## 2. Local development

```powershell
# .env (git-ignored)
YT_KEY=your-key-here
npm install
npm run dev
```

Without `YT_KEY` the function serves `fixtures/videos.json` and the app says
"Sample videos. Add an API key to see live results." That is the intended offline mode.

`npm run preview` builds nothing; run `npm run build` first.

## 3. Deploy to Vercel

The repo is already on GitHub: `github.com/karansingh-in/serein-yt`, branch `master`.

1. [vercel.com](https://vercel.com) → **Add New → Project → Import Git Repository** →
   `serein-yt`. Authorise GitHub the first time if asked. Hobby (free) is enough.
2. Leave the detected settings alone; they should read:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `./`
3. **Environment Variables** (before the first deploy, on the same screen):
   `YT_KEY` = the key from step 1, applied to Production, Preview and Development.
4. **Deploy.** First build takes about a minute. `api/videos.ts` is picked up as a Node
   function automatically; `vercel.json` supplies the SPA rewrite, the CSP, the referrer
   policy and the asset cache headers.
5. Check it: open `https://<project>.vercel.app/api/videos?topic=physics`. The JSON should
   contain `"source":"api"`. If it says `"fixtures"`, the variable is missing or the deploy
   predates it — add it, then **Deployments → ⋯ → Redeploy**.
6. Check the app itself: the home page should have no "Sample videos" line, and the CSP
   must not block thumbnails (`i.ytimg.com`) or the player (`www.youtube-nocookie.com`).

Later deploys are automatic: every push to `master` builds and ships. Environment variables
are not in the repo, so a fresh clone has no key until you add one.

Any static host works for the files, but the function is written for Vercel's Node runtime.

## 4. NextDNS

Create a profile for the iPad and apply it to the device.

- **Parental Control → Block Bypass Methods** — on. Otherwise a profile can be removed on
  the device itself.
- **Denylist:** `mask.icloud.com`, `mask-h2.icloud.com`, `mask-canary.icloud.com`
  (these serve Private Relay, which would bypass DNS filtering).
- **Allowlist:** `youtube-nocookie.com`, `googlevideo.com`, `ytimg.com`.
  The player needs all three: the frame, the media, the thumbnails.
- **Block the YouTube service** under Recreation Time, with a schedule covering the hours
  the iPad is not in use for study. This blocks the site and the app, not the embed.
- The app's own domain and `www.googleapis.com` are only needed by the browser if the API
  were called from the client. It is not, so no allowlist entry is required. Add
  `www.googleapis.com` only if you later change that design.

A DNS profile can be removed on the device. Screen Time is the real lock.

## 5. Screen Time (the actual lock)

On the iPad, with a passcode the owner keeps:

1. **Screen Time → Content & Privacy Restrictions** — on.
2. **Allowed Apps** — turn the YouTube app off (or delete it before enabling restrictions).
3. **iTunes & App Store Purchases → Installing Apps → Don't Allow**, and
   **Deleting Apps → Don't Allow.**
4. **Content Restrictions → Web Content → Limit Adult Websites**, then add the app's domain
   to **Allowed** so it keeps working.

## 6. Add to Home Screen

1. Open the deployed URL in **Safari** (not Chrome — only Safari installs a web app on iPad).
2. Share → **Add to Home Screen** → name it whatever `config/app.json` says → Add.
3. Launch it from the Home Screen icon. It opens standalone, without browser chrome.

The installed app has its own storage, so its first launch starts with an empty cache and
one network fetch. Later launches paint from cache instantly.

## 7. Checks

```powershell
npm run typecheck
npm test
npm run lint:design
npm run smoke      # needs Edge or Chrome installed
npm run shots      # writes docs/screens/
```

`npm run build` must stay inside the budget: JS ≤ 40 kB gzip, CSS ≤ 10 kB gzip, font
≤ 35 kB. The build log prints all three.

## Known gaps

- Nothing here has been run against the real iPad, a real key, or NextDNS.
- The embed is the official player; ads inside it cannot be removed and must not be.
