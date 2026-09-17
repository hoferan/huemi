# huemi: brief for a first UI draft

## What the app does

huemi matches clothing colors. You start from one garment you already own and the
app tells you what colors work for the rest of the outfit.

Three capabilities, in the order they will probably be built:

1. Pick a base color and get suggested colors for the other garment slots. Choose
   the color of your pants, see what works for the top, shoes and jacket.
2. Photograph a garment, let the app read its color, then get the same
   suggestions. This is how most people will actually start, because nobody knows
   the hex value of their trousers.
3. Photograph a whole outfit and get it rated for color matching.

People can save outfits and come back to them later.

## Who is using it and where

One person getting dressed, holding a phone, standing at a wardrobe or in a shop
changing room. Design mobile portrait first. Desktop is a secondary layout.

Lighting will often be bad. Wardrobes are dim and shop mirrors are lit strangely.

## Screens the draft should cover

An entry point. The user arrives either with a color in mind or with a garment in
hand, so both routes need to be reachable immediately.

Color input, for picking a base color directly.

Camera capture and confirmation. Framing a garment, then confirming the color the
app read. The confirmation step matters because extraction will sometimes be
wrong, and the user needs to correct it without starting over.

Suggestions. This is the core screen: a locked base color, suggested colors for
each remaining garment slot, and a way to see alternatives for any one slot.

Outfit rating. A photo with a score and some explanation of that score.

A saved collection, listing outfits the user kept.

## Garment slots

Assume top, bottom, shoes, outerwear and one accessory slot. This is not settled,
so treat it as a starting point.

## Constraints that should shape the design

Color is the content here, so the interface around it has to stay out of the way.
Surrounding hues shift how a color is perceived, which means saturated chrome,
colored buttons and decorative accents will actively mislead the user. Use neutral
greys and leave generous separation between color areas.

Show colors large. People judge clothing color at the scale of a garment, not a
swatch. Big blocks read more honestly than chips, and they suit what the app is
called.

The app has to stay usable in poor light, so text and controls need strong
contrast against their background even when the color areas beside them are dark.

Every color shown is a suggestion. The design should let someone reject one and
see another quickly, because that is the main interaction in the app.

## What is still open

Nothing about the color logic has been decided, and it is the part that makes or
breaks the product. Clothing matching does not follow classical color wheel
harmony. Complementary and triadic schemes produce combinations people will not
wear. The real rules lean on neutrals, value contrast, warm and cool grouping, and
a limit on how many saturated colors appear at once.

Also open: whether a rating is one number or a set of observations, whether saved
items live only on the device, and whether the slot list above is right.

The draft does not need to resolve any of this. It needs to show the shape of the
screens well enough to argue about.
