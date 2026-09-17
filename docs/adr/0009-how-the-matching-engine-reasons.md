# 0009. How the matching engine reasons about color

Status: Accepted, 2026-09-17

## Context

[ADR 0006](0006-color-engine-before-screens.md) held the engine back behind a prior-art
review, on the grounds that the matching rules should not be invented at the keyboard.
This is that review and the decisions it reached.

The brief left the color logic open and ruled out one starting point: clothing matching
does not follow classical color wheel harmony, and complementary and triadic schemes
produce combinations people will not wear. ADR 0006 said to treat that as a finding to
test rather than an axiom. Milestone one committed to OKLab for color naming, and this
review was asked to confirm or revise it.

### Which space the engine reasons in

OKLab was fitted for appearance uniformity: even perceived steps in lightness, chroma and
hue. Its author reports the lowest errors of the spaces he compared for predicting
lightness and chroma, and notes that the fit used CAM16-derived data rather than direct
experimental data ([Ottosson](https://bottosson.github.io/posts/oklab/)).

That is not the same property as predicting whether two nearly identical colors look
different, and the two diverge sharply. Against the COMBVD visual datasets OKLab scores
STRESS 47.35 where CIEDE2000 scores 29.13; on the BFD-P D65 subset it is 51.45 against
24.12. The two spaces were fitted against different objectives, and "optimization for one
provides no guarantee of performance on the other"
([Oklch+, arXiv:2606.05255](https://arxiv.org/abs/2606.05255)).

huemi never asks the question OKLab is bad at. It asks whether two garment colors sit far
apart in lightness, how chromatic each one is, and whether their hues group, all of them
appearance attributes. CAM16-UCS scores better on uniformity but takes viewing-condition
parameters, and huemi has none to give: the wardrobe's bad lighting is the problem the app
exists to survive, not a parameter it knows.

HSL is disqualified outright. Yellow and blue at the same HSL lightness differ enormously
in perceived lightness, and HSL saturation is neither chroma nor colorfulness in the sense
the CIE defines them.

### Whether the brief is right to reject classical harmony

It is right about the conclusion and wrong about the mechanism.

Schloss and Palmer separate three judgments people make about a color pair that earlier
work had run together: preference for the pair, harmony of the pair, and preference for
the figural color against its background. Pair preference and harmony both rise with hue
similarity, and preference leans more on lightness contrast and on how much the component
colors are liked on their own. Pairs with strongly contrasting hues are judged neither
preferable nor harmonious, yet figural preference rises as the figure's hue contrast
against the background rises
([Schloss and Palmer 2011](https://doi.org/10.3758/s13414-010-0027-0)).

Ou and Luo fit a two-color harmony model over 1431 pairs drawn from 54 CIELAB colors and
land on four factors: chromatic difference, lightness sum, lightness difference, and a hue
effect. Hue enters as which hues are present, not as an angle between them
([Ou and Luo 2006](https://doi.org/10.1002/col.20208)).

The most recent data agrees. Preferences are strongly hue dependent, "thereby challenging
classical color harmony theories," and the hue separations that survive averaging line up
with hue distributions in natural landscapes rather than with any wheel geometry
([Forni, Darmon and Benzaquen 2025](https://arxiv.org/abs/2508.15777)).

So the wheel is not a rule. The brief's framing, that complementary pairs are unwearable,
is not what the evidence says either. Hue geometry is the wrong variable to build on, and
lightness and chroma carry more.

### What the clothing-specific evidence says

Two results bear directly on outfits.

Coordination and fashionableness follow an inverted U. Outfits rated most fashionable are
moderately matched, neither maximally matched nor clashing. For women's clothing the
linear trend explains 18% of variance and the quadratic 44%; for men's there is no linear
trend at all and the quadratic explains 28%
([Gray, Schmitt, Strohminger and Kassam 2014](https://doi.org/10.1371/journal.pone.0102772)).
The study measured coordination by asking people to rate color pairs rather than by any
color metric, so it gives the shape of the target and not a formula for it.

Color alone carries most of outfit compatibility. Working in Lab, taking three K-means
dominant colors per garment, a color-only model reaches 0.84 AUC on compatibility
prediction and 58.0% on fill-in-the-blank, against 0.91 and 59.2% for the same framework
on ResNet18 image features. The compatibility templates it recovers are outfits sharing
similar colors, and outfits built from two distinct chromatic colors alongside low-chroma
neutrals such as black or white ([Zhang and others 2020](https://arxiv.org/abs/2007.02388)).

Polyvore is curated and skews to luxury brands, so it records what stylists post rather
than what people wear. It is still the closest thing to ground truth available, and both
of its templates match what the brief predicted from styling convention.

### Area, and the cap on saturated colors

Moon and Spencer worked in Munsell and tabulated moment arms that grow with chroma at each
value, so a more chromatic color needs a smaller area to balance one that is less chromatic
([Moon and Spencer 1944](https://doi.org/10.1364/JOSA.34.000093)).

The framework around that table is the same classical geometry the modern data undercuts,
and none of it is adopted here. The area observation is worth keeping on its own: garment
slots differ enormously in area, so a cap that counts saturated colors treats a scarf and a
coat alike when the eye does not.

### Seasonal color analysis

There is no usable evidence base. Classifications disagree between analysts, and the
structure does not appear in color data when someone goes looking for it. Nothing here is
implemented.

## Decision

The engine reasons in OKLab. Milestone one's commitment survives the review. Lightness is
OKLab L, chroma is the magnitude of the a and b pair, hue is their angle. `oklabDistance`
stays as a ranking device and is not a perceptual-difference threshold.

Neutrality is judged by OKLab chroma. The HSL saturation cutoff in `classify.ts` goes.

No geometric scheme, in either direction. Nothing complementary, triadic or analogous is
encoded as a rule, and nothing is rejected for being complementary either.

The scoring primitives are lightness contrast, a chroma budget weighted by the area of the
slot rather than a count of saturated colors, and warm and cool grouping on OKLab hue with
neutrals exempt.

Suggestions aim at a middle band of coordination rather than at a maximum.

Figure and ground are distinguished. The slot being suggested is the figure, the locked
base is its ground, and hue contrast is read differently for the two.

## Consequences

Issue #8 gets its primitives named in OKLab terms, #38 gets the evidence it was missing,
and #37's distance-aware naming reuses the same decomposition into lightness, chroma and
hue.

Milestone five's rating logic reads this model backwards, as ADR 0006 anticipated, and
draws on these sources rather than repeating the review.

The area-weighted chroma budget needs a per-slot area, which the slot list does not carry
today. Milestone three owes it.

The middle band is a shape without a scale. Nothing in the literature fixes where it sits
for clothing, so the corpus in #11 and the harness in #9 have to settle it by looking. This
is the review's main unanswered question. Leaving it open is deliberate; the alternative
was to borrow a constant from a study of something other than clothes.

Choosing OKLab for appearance reasoning means huemi has the wrong tool for fine difference
judgments. When milestone four needs to decide whether two photographed garments are the
same color, that comparison wants CIEDE2000 and should not reuse `oklabDistance`.
