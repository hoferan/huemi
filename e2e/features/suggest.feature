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

  Scenario: Shuffle does not animate when motion is reduced
    Given I prefer reduced motion
    When I open the suggestions for a mustard top
    Then the "Shoes" block has a transition duration of "0s"
