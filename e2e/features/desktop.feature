Feature: A desktop window

  huemi is designed for a phone. In a wide window every screen, sheet and
  toast keeps to one centered column, as a mobile-first web app does, rather
  than stretching across the window.

  Background:
    Given I have seen the welcome screen
    And I use a desktop window

  Scenario: Each screen is a column in the middle of the window
    When I open huemi
    Then the screen is a centered column at most 480 wide

  Scenario: A sheet opens over the column, not across the window
    When I open the outfit pieces
    And I open the piece "Top: not set"
    Then the sheet is a centered column at most 480 wide

  Scenario: A toast stays over the column
    When I open the suggestions for a mustard top
    And I save the outfit
    Then the toast is a centered column at most 448 wide
