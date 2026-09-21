Feature: Entry screen

  The entry screen is where huemi starts: it says what to do, and its one
  control begins the color route.

  Scenario: Arriving at huemi
    Given I have seen the welcome screen
    And I open huemi
    Then I see the heading "Start with a garment"
    And the button "Pick a color" has background "#1c1b1a"

  Scenario: Arriving for the first time
    Given I open huemi
    Then I see the heading "One piece you own. The rest that goes with it."
