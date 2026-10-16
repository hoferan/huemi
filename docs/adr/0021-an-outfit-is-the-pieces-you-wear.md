# 0021. An outfit is the pieces you wear

Status: Accepted, 2026-10-12. Amends ADR 0005 and ADR 0012. Amended 2026-10-15 for the
dress (#136).

## Context

Until now the suggestions screen showed five pieces for every outfit: outerwear, top,
bottom, shoes and an accessory. Plenty of outfits have fewer. People skip the
accessory, and leave the coat at home in summer.

A piece nobody wears still cost something. ADR 0012's composer never shows a color
name twice, so a phantom Camel accessory kept the shoes from being Camel. It also
spent the chroma budget ADR 0009 sets, and outerwear spends the most of it because it
has the largest area. A coat that stayed in the wardrobe left the pieces that were
worn duller than they needed to be. Saved and shared outfits carried the phantom
pieces as well.

ADR 0005 anticipated this: `Outfit.pieces` is partial because "the accessory slot can
be switched off". Nothing in the app could switch it off, and the session had no way
to tell a piece left out on purpose from one not suggested yet. A missing pick meant
both.

## Decision

Which optional pieces an outfit wears is explicit state, a `Shape` in
`src/model/shape.ts`. Outerwear and the accessory are optional. Shoes, top and bottom
are always worn, so the shape has no field for them and cannot leave them out. The
base is always worn too.

The session holds the shape, and it is null until an outfit is seeded or loaded for
the base. That null is how the suggestions screen tells "nothing composed yet" apart
from a choice. `composeOutfit` takes the shape and fills only the slots it wears, so a
piece left out takes no name and no budget. ADR 0012's two rules are unchanged and now
apply across the pieces worn.

The person sets the shape from a Pieces sheet on the suggestions screen. Switching a
piece off removes it and leaves the others as they are. Switching one on fills only
that piece. huemi remembers the switches in `huemi.pieces` in localStorage, on the
device like everything else (ADR 0013), and only the sheet writes it. A base that
forces its own slot on never reaches storage.

The `/suggest` URL is unchanged (ADR 0011). A refresh rebuilds the seed with the
remembered pieces.

A saved outfit reopens with the shape its pieces give it. A missing outerwear or
accessory means it was not worn, which settles what ADR 0005's partial record means. A
missing shoe, top or bottom is filled with the usual starting suggestion, because no
outfit leaves those out; only an outfit saved from the outfit check can lack one. The
product owner chose that over opening such outfits exactly as saved, which would have
made shoes optional for those outfits alone.

The stored format keeps `version: 1`. Every outfit stored so far is valid under the new
reading, so nothing migrates, and a version bump would not change what an older build
does with a newer outfit.

## Consequences

An outfit saved from a shared link or from a check, without outerwear or an
accessory, used to reopen with those filled in. It now reopens without them. Outfits
saved from the suggestions screen always had all five pieces, so they open as before.

## Amendment, 2026-10-15: the dress

huemi had no dress. Someone who picked a dress as their top got a bottom in another
color, because the composer never shows a color name twice.

`dress` is now a slot, between the bottom and the shoes in `SLOTS`. Its area for the
chroma budget is a top's plus a bottom's, so a saturated dress spends what the two of
them would. The shape has a `dress` field, and `isWorn` reads it for all three slots:
an outfit wears a top and a bottom, or a dress in their place. The composer, the
session and every screen that follows the shape pick that up without code of their
own.

The Pieces sheet asks with two radios, "Top and bottom" and "Dress", in the row where
those pieces sit. A top, a bottom or a dress as the base settles the answer, and the
row then shows the settled value and why. Switching to a dress drops the top and the
bottom along with their locks, and fills one dress with every other piece held.
Switching back does the same the other way. `huemi.pieces` remembers the choice with
the switches, and as with them only the sheet writes it. The product owner chose,
from mocks, to remember it for the next outfit.

huemi never writes a dress beside a top or a bottom. A stored outfit or a share link
that has one is treated as unreadable, since showing it would show the body twice.
Links already sent have no `dress` parameter and open as they did (ADR 0018). A build
from before the dress ignores the parameter, so it opens a new link without the dress
until its service worker updates, on the next load.

Stored outfits keep `version: 1`, for the reason above: every outfit stored so far
reads the same, and a bump would not change what an older build does.

The outfit check takes a dress too (#137). Its top step has an "It's a dress" button
that turns the step into "Tap your dress" and drops the bottom's step, so the count
covers the steps actually walked: three with a dress, four without. The dress step has
a "Top and bottom" button to go back. The list asks with the Pieces sheet's radios, in
the same head-to-toe place. The product owner chose both from mocks. The result shows
one Dress block, sized by its area, and its sentences call it a dress. A check keeps
the colors of whichever answer is not chosen, out of sight, so changing your mind
finds them set. The check doesn't remember the answer between checks: a new photo
starts with a top and a bottom, and the top step asks.
