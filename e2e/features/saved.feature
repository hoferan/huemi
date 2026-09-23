Feature: Saved outfits

  Saving is the first thing in huemi that outlives a reload, so these run
  against a real build and real localStorage rather than the fake store the
  unit tests use.

  Background:
    Given I have seen the welcome screen

  Scenario: The entry screen leads to the saved outfits
    Given I open huemi
    When I follow the link "Saved"
    Then I see the heading "Saved outfits"

  Scenario: A saved outfit is still there after a reload
    When I open the suggestions for a mustard top
    And I save the outfit
    And I open the saved outfits
    And I reload the page
    Then I see a saved outfit named "Mustard top"

  # Pressed means every piece matches a saved outfit, which is the proof that
  # the colours came back rather than a fresh suggestion.
  Scenario: Opening a saved outfit brings its colours back
    Given I have a saved outfit
    When I open the saved outfits
    And I open the saved outfit "Navy bottom"
    Then the block "Bottom" has background "#1f2a44"
    And the block "Shoes" has background "#2f4a3a"
    And the save control is pressed

  Scenario: A deletion can be undone
    Given I have a saved outfit
    When I open the saved outfits
    And I delete the saved outfit "Navy bottom"
    Then the Undo control has focus
    When I press Undo
    Then I see a saved outfit named "Navy bottom"

  Scenario: A deletion that is not undone sticks
    Given I have a saved outfit
    When I open the saved outfits
    And I delete the saved outfit "Navy bottom"
    And I move focus away from the toast
    And the toast goes away
    And I reload the page
    Then I am told nothing is saved

  Scenario: The toast does not slide when motion is reduced
    Given I prefer reduced motion
    When I open the suggestions for a mustard top
    And I save the outfit
    Then the toast has an animation duration of "0s"

  Scenario: The toast slides otherwise
    When I open the suggestions for a mustard top
    And I save the outfit
    Then the toast has an animation duration of "0.2s"
