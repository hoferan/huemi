# 0004. Put black or white text on color, not a softened pair

Status: Accepted, 2026-09-16

## Context

Most of this interface is large blocks of garment color with a slot name and a color
name written on them. Those labels have to stay readable on any color the app can
produce, which includes arbitrary hexes from the camera and from the free picker,
not only the eighteen named palette colors.

The prototype chooses between a near-black `#141414` and a near-white `#f4f4f2` by
thresholding relative luminance at 0.35. The crossover where the two are equally
readable is near 0.18, so the threshold is far off and picks the wrong foreground
across a wide band. Grey `#8a8a8a` lands at 3.13 to 1, Camel `#b58a5a` at 2.83, and
Khaki `#a89c78` at 2.48, all under the 4.5 to 1 floor for normal text.

Two independent analyses computed the ratios for all eighteen palette colors against
both candidates and agreed, and the numbers were re-derived a third time before this
was decided. The handoff notes also name Denim `#4a6285` as suspect; it passes at
5.65 and is not a problem.

Selecting by comparing both ratios rather than thresholding fixes the palette
entirely. It does not fix everything. With the softened pair there is a band of
luminance between roughly 0.162 and 0.207 where neither foreground reaches 4.5 to 1.
That band is about five percent of the free picker's range and includes the mid greys
around `#707070` to `#7d7d7d`, so camera readings and picked colors can land in it.

## Decision

The foreground pair is `#000` and `#fff`, held as the `fgDark` and `fgLight` tokens.
Selection compares both contrast ratios and takes the better one. Thresholding on
luminance is never used.

The prototype's slot caption at 80 percent opacity is not reproduced. At that alpha
five palette colors fall under 4.5 to 1 even with the best foreground.

## Consequences

The contrast contract becomes total rather than conditional. The worst case across
every color the app can produce is 4.58 to 1, at luminance 0.179, so there is no
fallback path that a future screen can forget to implement. The brief's requirement
that text stay strongly contrasted in poor light points the same way.

`readableForeground` still returns a discriminated union with a scrim branch, even
though that branch is unreachable at the 4.5 floor. It takes a minimum ratio, and at
the AAA level of 7 to 1 the branch is needed again, so the type forces a caller
asking for AAA to handle the case rather than silently receiving a failing color.

`contrastOver` exists so translucent text can be measured rather than assumed, which
is what made the 80 percent caption problem visible.

The cost is a small departure from the prototype's softened look. On large areas of
color the difference between `#000` and `#141414` is barely perceptible, which is
why the accessibility guarantee wins.

This decision is enforced by tests that sweep the entire hue, saturation and
lightness range of the picker rather than only the named palette.
