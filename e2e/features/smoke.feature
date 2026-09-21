Feature: Entry screen

  The entry screen is where huemi starts: it says what to do, and its one
  control begins the color route.

  Scenario: Arriving at huemi
    Given I open huemi
    Then I see the heading "Start with a garment"
    And the button "Pick a color" has background "#1c1b1a"
