# huemi — handoff notes for the MVP prototype

Prototype: `huemi Studio.dc.html`. Its matching logic is placeholder; this note records what the real build needs beyond the screens.

## Motion and haptics
- Swipe on a suggestion block: light haptic tick when the color changes. Threshold 30px horizontal; ignore when vertical movement dominates.
- Color change on a block: 150ms crossfade of the background (no slide). Name text fades with it.
- Hold to keep: 450ms press. Medium haptic on lock, lock icon scales in (120ms). Same on release.
- Shuffle: unlocked blocks crossfade together, 200ms, no stagger.
- Bottom sheets (alternatives, manage, tap-colors): spring, ~320ms, 45% dim behind. Tap dim or drag handle to dismiss.
- Toast: slides up 200ms, auto-dismiss 2.5s (5s when it carries an action). One toast at a time; a new one replaces the current.
- Screen transitions: forward slides in from right; back slides out to right. Confirm → Suggestions: fade, the layout changes completely.

## Accessibility
- Every color block exposes slot and color name ("Top: Pale blue") as its accessible label. The peek strip is a button labelled "Next suggestion".
- Text on swatches: fg() flips between near-black and near-white at one luminance threshold. Verify ≥ 4.5:1 on mid-value colors (Grey #8a8a8a, Khaki #a89c78, Denim #4a6285, Camel #b58a5a). Where it fails, put the label in a translucent pill instead of raw on the color.
- Hit targets ≥ 44px. The "next" strip is 44px wide.
- Long-press needs a non-gesture alternative: add "Keep this" to the alternatives sheet.
- Season sort changes and toasts must be announced (live region).

## Data model
- Garment: { id, slot, hex, name, source: camera | photo | picker | link, photoRef?, correctedFrom? }
- Outfit: { id, name, note?, createdAt, baseSlot, pieces: { [slot]: hex } }
- Store outfit pieces as hexes, not as indices into the suggestion list (the prototype uses indices; they break when the algorithm changes).
- Log corrections (camera read → user pick); they are training data for the reader.
- Onboarding: one local boolean.

## Empty and error states
- In the prototype: camera denied (fallback to pick / photo library), too dark to read, nothing saved. The camera screen has a "Demo" line to toggle them.
- Not yet: no network (if suggestions go server-side), patterned or multicolor garment, photo without a clear garment.

## Copy tone
- Avoid "rate", "score", "fix". Use "check", "how it works together", "swap". The sentence is the result; the number is a tag.

## Phase 2 (not designed)
- Personal color / undertone setup. Wardrobe import (shop links, purchase history). Share as image. Shop the missing piece.
