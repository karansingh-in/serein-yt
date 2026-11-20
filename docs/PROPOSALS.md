# Proposals

Ideas not in SPEC.md. Add here instead of building. The owner decides.

## Tighten the topic queries (from the first live run, 2026-11-20)

Live `search.list` on the three topics returns a lot of exam-prep material:

| Topic | Exam-prep sounding titles |
|---|---|
| Linear algebra | 1 of 18 |
| Organic chemistry | 8 of 18 |
| Statistics | 5 of 18 |

Examples: "Yakeen 2.0 2027 — 1st Free Class", "UPSC NDA 2 2026 || Statistics — One Shot",
"Statistics in 20 Minutes | Most Important Questions | Class 10", "Full Marks in Class 12
Organic Chemistry". These are not wrong, but they are not the calm lecture feel the app is
for, and their thumbnails are the loudest thing on the page.

Two cheap levers, no code:

1. Add to every topic's `exclude`:
   `"one shot", "revision", "board exam", "full marks", "most important questions",
   "class 10", "class 12", "neet", "jee", "upsc", "nda", "cbse", "marathon", "hindi"`
2. Make the query more specific, e.g. `"university linear algebra lecture"`,
   `"organic chemistry university lecture"`, `"statistics course lecture"`.

Trade-off: excludes only see the title, so a good lecture with "Class 12" in its title is
lost, and narrower queries return fewer results (the page may end up short). Worth one
round of tuning, then leave it alone.
