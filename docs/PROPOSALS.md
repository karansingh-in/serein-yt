# Proposals

Ideas not in SPEC.md. Add here instead of building. The owner decides.

## Superseded: tightening the topic queries

The 2026-11-20 proposal to exclude exam-prep wording was overtaken by the owner's decision
on the same day: the app is now scoped to NEET/JEE study channels only, so exam-prep
framing is the point. Kept here for the record, not as work to do.

## The topic row on a phone

Seven topics do not fit on a 390 px screen. The row scrolls horizontally and the active tab
is scrolled into view on render, so it is usable, but the left edge cuts a label mid-word
("…stry"), which reads as a bug rather than as a scroll. Options if it bothers you:

- wrap the row into two lines under 600 px (all labels visible, more vertical noise);
- shrink the gap from 24 px to 16 px and the font to 14 px (fits more, still not all);
- leave it: the iPad in portrait fits all seven, and that is the target device.

## Fixture thumbnails still say "Eigenvectors", "Singular values"

The sample images were drawn for the old topics. They are clearly marked SAMPLE, but the
words no longer match the titles next to them. Regenerating six images with the new subject
names would remove the mismatch.

## After 4C: playback speed, remembered

The embed is already wired for `postMessage`, so `setPlaybackRate` is one more command and
one small control. Lectures are the use case: 1.25× and 1.5× are normal for a one-shot, and
1× for a derivation. Remember the last speed, apply it on the next video, show it in the
player line. About 30 lines plus a three-option control under the player. This is the
cheapest real feature left, and it needs no new permission.

## Saved for later

The app has no way to keep a video you are not ready for. A "Save" action on the watch
screen and on cards, a Saved list in the tab row, all in `localStorage`, no accounts. About
60 lines. The one thing a study app is expected to have and this one does not.

## Quota meter

`search.list` costs 100 units and the free tier is 10,000 a day; when it runs dry the feed
says "Couldn't refresh", which reads like a network fault. Counting calls client-side and
showing "about 600 of 10,000 units used today" on the History or Resources page would
explain the one failure the app cannot fix itself. About 30 lines, no API.

## Warm the topics once a day

A Vercel cron hitting a small `/api/warm` endpoint would refresh each topic on a schedule,
so the client never pays 100 units for a topic it already has. Removes quota exhaustion as
a failure mode almost entirely. Needs a cron entry, a shared secret header, and care not to
run it when the key is missing.

## Accessibility, for real

SPEC section 9 lists `npm run a11y` (axe, no serious or critical findings) and it has never
been run. Adding `@axe-core/playwright` to the smoke run, fixing what it finds, and moving
focus to `#main` after a route change would make the app usable with a screen reader and
would satisfy the app's own definition of done. Invisible work, no visual change.

## Keyboard, on the Mac at least

`/` to focus search, `j`/`k` to move between cards, `Enter` to open, `Escape` to go back,
`f` to maximize. About 40 lines, no markup change, and it makes the desktop layout feel
finished. The iPad is the target, so this is a convenience, not a priority.

## Hide what you have already watched

The feed already dims opened videos. A "Hide watched" toggle would remove them entirely,
which is what you want when working through a playlist. About 15 lines, reuses the existing
`opened` set.

## Export progress

History and saved positions live only in the iPad's `localStorage`, which iOS can evict. One
button that downloads a JSON file, and one that reads it back, would make that recoverable.
About 30 lines.

**Recommended order:** playback speed, saved for later, then the accessibility pass. The
first two are what a study app is expected to do; the third is what the SPEC already
promised.
