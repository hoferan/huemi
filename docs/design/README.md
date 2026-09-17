# Design record

These files are the first draft of huemi's interface, exported from Claude
Design before any code existed. The implementation supersedes them screen by
screen. Where the two disagree, the code is right.

They are here to be read, not run. The prototypes' runtime JavaScript is not
committed, so opening them in a browser will not work.

## Files

- `brief.md` — the original product brief
- `handoff-notes.md` — motion, accessibility, data model, empty states, copy tone
- `prototypes/huemi-studio.dc.html` — the primary prototype, all screens
- `prototypes/huemi-flow.dc.html` — the same flow on a different token set
- `prototypes/huemi-logo-options.dc.html` — logo explorations
- `prototypes/_ds/styles.css` — the token set used by the Flow prototype

## Studio is authoritative

The two prototypes disagree. Flow defines Light grey as `#c9c7c2` and White as
`#f2f0eb`, against Studio's `#e6e5e2` and `#f7f6f3`, and uses a different
foreground pair. The implementation follows Studio.

Flow's `_ds` token set was rejected on a product constraint, not merely
superseded. It is warm cream on a saturated orange accent, and the brief is
explicit that "saturated chrome, colored buttons and decorative accents will
actively mislead the user." It also fails its own contrast: the accent on the
background is 3.03:1, and so is the primary button.

## Known defects in the prototypes

Recorded so nobody reproduces them by copying faithfully.

1. The foreground flip thresholds luminance at 0.35 when the crossover is near
   0.18, giving Grey 3.13:1, Camel 2.83:1 and Khaki 2.48:1 — all under 4.5:1.
   The handoff notes also name Denim as suspect; it passes at 5.65:1.
2. The slot caption runs at `opacity: .8`, which drops five colors under
   4.5:1 even with the best foreground.
3. The swipe reads `clientX` and never `clientY`, so "ignore when vertical
   movement dominates" is unimplemented.
4. Saved outfits store indices into the suggestion list and re-run the
   suggestion at display time, so they are unstable even within one run.

Three requirements from the handoff notes have no implementation at all: the
"Keep this" alternative to the long press, any live region, and an accessible
label on the suggestion block.
