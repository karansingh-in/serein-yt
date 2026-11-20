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
