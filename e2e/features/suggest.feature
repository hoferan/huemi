Feature: Suggestions

  The four checks A11Y.md records as waiting for this screen to have a route.
  StyleX emits no CSS under Vitest (ADR 0002), so none of them can be made in a
  unit test: only a real build proves the colour, the size, the motion and the
  focus ring reached the browser.

  Background:
    Given I have seen the welcome screen

  Scenario: A block renders the exact colour it was given
    When I open the suggestions for a mustard top
    Then the block "Top" has background "#c39a3a"

  Scenario: Every control on a block is big enough to hit
    When I open the suggestions for a mustard top
    Then every control on the "Shoes" block is at least 44 by 44

  Scenario: The focus ring is drawn against the colour underneath it
    When I open the suggestions for a mustard top
    And I focus the "Next suggestion for Shoes" control
    Then its outline colour matches the block's foreground
    And the focus ring is drawn on it

  # Measured while the crossfade is actually running. At rest the blocks carry
  # colorFade, so an assertion taken there says nothing about shuffle. Time is
  # held still first, because the flag that selects the shuffle duration clears
  # itself on a 200ms timer and racing that would be a scenario that passes by
  # arriving late.
  Scenario: Shuffle does not animate when motion is reduced
    Given I prefer reduced motion
    When I open the suggestions for a mustard top
    And time stops
    And I shuffle
    Then the "Shoes" block has a transition duration of "0s"

  # The same measurement with the preference off, which is what proves the one
  # above measured the shuffle at all: at rest a block reads 0.15s, so 0.2s can
  # only come from the crossfade being live.
  Scenario: Shuffle animates at its own duration otherwise
    When I open the suggestions for a mustard top
    And time stops
    And I shuffle
    Then the "Shoes" block has a transition duration of "0.2s"

  # The path a user actually takes into this screen, and the one nothing
  # covered: the picker dispatches the base and then navigates, so the screen
  # mounts on a session that already agrees with the URL and holds no picks.
  Scenario: Arriving from the picker
    Given I open the picker for the top
    When I choose the swatch "Mustard"
    Then I see the heading "Goes with it"
    And the "Shoes" block carries a suggestion
