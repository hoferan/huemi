# Architecture decision records

One file per decision that shaped huemi and would otherwise be reconstructed from
guesswork. Each records the context, the decision, and what it costs.

These explain why, not how. The code is the authority on how, and it changes; a
record that described the implementation would be wrong within a release. Where a
decision is already enforced by a test, a lint rule or a comment in a config file,
the record points at that enforcement rather than repeating it.

Superpowers specs and plans are deliberately not committed. They are working
documents for a single task and they go stale as soon as the code diverges from
them, which happens quickly: the milestone one plan alone carried five defects that
the review loop caught. A committed plan invites a future contributor to correct
working code back into a documented mistake.

## Format

Context, decision, consequences. Status is Accepted unless a later record
supersedes it, in which case both say so.

## Records

|                                                   | Decision                                                  |
| ------------------------------------------------- | --------------------------------------------------------- |
| [0001](0001-client-side-spa-on-vite.md)           | Build huemi as a client-side single-page app on Vite      |
| [0002](0002-stylex-over-tailwind.md)              | Style with StyleX rather than Tailwind                    |
| [0003](0003-radix-over-shadcn.md)                 | Use Radix primitives rather than shadcn/ui                |
| [0004](0004-black-and-white-foreground.md)        | Put black or white text on color, not a softened pair     |
| [0005](0005-outfits-store-hexes.md)               | Store outfit pieces as hexes, never as suggestion indices |
| [0006](0006-color-engine-before-screens.md)       | Build the color engine before any screen                  |
| [0007](0007-transient-plans-durable-decisions.md) | Keep working documents transient and decisions durable    |
| [0008](0008-gherkin-feature-files-for-e2e.md)     | Write end-to-end tests as Gherkin feature files           |
| [0009](0009-how-the-matching-engine-reasons.md)   | Reason about color in OKLab, with no harmony geometry     |
