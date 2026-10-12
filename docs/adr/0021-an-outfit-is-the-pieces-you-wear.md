# 0021. An outfit is the pieces you wear

Status: Accepted, 2026-10-12. Amends ADR 0005 and ADR 0012.

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

The dress (#136) joins the shape as a third choice, top and bottom or a dress, and
amends this record when it does.
