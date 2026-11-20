# Google Stitch prompts

Open stitch.withgoogle.com with a Google account. Pick a tablet (iPad) device type if it asks. Paste prompt 1, then send the others **one per message** in the same project. Stitch tends to drop details from long prompts, so each one is kept short. Do not mix layout changes and component changes in one message.

If the result has gradients, shadows, bright colours, icons everywhere or filler content, send the cleanup prompt (7).

When you like the result, export the HTML/CSS (or take screenshots) and put them in `design/stitch/` in the project. opencode treats them as a visual reference only; the tokens in `docs/SPEC.md` win.

"Serein" is a placeholder app name. Change it in `config/app.json` later.

## 1. Home screen (light, iPad landscape)
```
Design a tablet web app screen (iPad landscape, 1180x820, light mode) for "Serein", a calm, distraction-free video browser for studying. It shows videos only from a few chosen topics.

Layout: a 72px top bar. At left the wordmark "Serein" in semibold sans-serif, text only, no logo. Next to it a wide search field (44px tall, 10px radius, 1px hairline border, placeholder "Search your topics"). At far right a plain text link "Settings". Below the bar, a row of plain text topic tabs: All, Linear algebra, Organic chemistry, Statistics. The active tab "All" has a 2px dark green underline. Below, a 3-column grid of 9 video cards. Each card: a 16:9 thumbnail with 12px radius, then a semibold title (max 2 lines), then one small grey line "Channel name, 24 min, 3 days ago". At the bottom, a quiet line "That's everything on your topics."

Style: calm, precise, premium, as if designed by Apple. Lots of white space: 56px between grid rows, 72px between sections. Background warm off-white #F5F4F0, text #141413, secondary text #5C5B57, one accent deep green #23483C used only for the active tab underline. Font: Geist or a clean neo-grotesque, weights 400/500/600. 1px dividers at 10% opacity.

Strict rules: no gradients, no shadows, no glassmorphism, no emoji, no avatars, no badges, no view counts, no like counts, no red, no purple, no bordered cards. The only icon is a thin search icon in the field. Thumbnails are the only imagery: realistic, varied educational lecture thumbnails.
```

## 2. Watch screen
```
Create the video watch screen in the same style, iPad landscape. Same top bar. Below it, a plain text link "Back" at the left. Then a centered 16:9 video player about 1000px wide (a dark placeholder with a simple play control), with generous white space above and below. Under the player: the title in 28px semibold, one grey line "Channel name, 24 min, 3 days ago", then a description clamped to 3 lines with a text link "More".

Nothing else on the page: no comments, no related videos, no sidebar, no share or like buttons. No gradients, no shadows, no emoji.
```

## 3. Search results
```
Create the search results screen in the same style, iPad landscape. Same top bar with "linear algebra" typed in the search field. Under it the topic tabs: All (active), Linear algebra, Organic chemistry, Statistics. Then a vertical list of 6 result rows. Each row: a 16:9 thumbnail 280px wide on the left (12px radius), and on the right a semibold title, a grey line "Channel name, 24 min, 3 days ago", and a two-line grey description. 40px between rows, no dividers, no cards. At the end a text link "Search this topic on the web". No gradients, shadows, emoji or badges.
```

## 4. Settings
```
Create the settings screen in the same style, iPad landscape. Same top bar. A 34px semibold page title "Settings", 72px of space below it. Three sections separated only by white space: "Appearance" with a text segmented control (Light, Dark, Auto; the selected option has a 1px dark outline); "Your topics" with a plain read-only list: Linear algebra, Organic chemistry, Statistics, and a small grey note "Topics are set by the owner."; "About" with "Serein" and "Version 1.0". Narrow reading column about 640px wide, left aligned. No icons, gradients, shadows, emoji.
```

## 5. Dark mode
```
Show the Home screen again in dark mode with the same layout. Background #0F0F0E, text #EDEBE6, secondary text #A3A09A, accent #9CC4B3 used only for the active tab underline, hairlines at 10% opacity in light grey. Keep every other rule: no gradients, no shadows, no glow.
```

## 6. Phone variant
```
Show the Home screen on a phone (390x844, light mode). One column of video cards. The top bar shows the wordmark and a search field below it. The topic tabs scroll horizontally with no arrows. Same colors, same rules, same generous white space, thumbnails at full width with 12px radius.
```

## 7. Cleanup (send if the design gets noisy)
```
Remove every gradient, shadow, glow, border around cards, decorative icon, badge and emoji. Use only these colors: #F5F4F0 background, #141413 text, #5C5B57 secondary text, #23483C accent. Increase white space between sections to 72px and between rows to 56px. Keep layout and content unchanged.
```

## Small refinements (one at a time)
- "Make the thumbnails 12px radius and the same size across all cards."
- "Make the title text 17px medium weight, two lines maximum, tighter letter spacing."
- "Align the search field and tabs to the same left edge as the grid."
- "Make the topic tabs 44px tall with more horizontal spacing."
