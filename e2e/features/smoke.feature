Feature: Entry screen

  The entry screen is where huemi starts: it says what to do, and its
  buttons begin the camera or color route.

  Scenario: Arriving at huemi
    Given I have seen the welcome screen
    And I open huemi
    Then I see the heading "Start with a garment"
    And the button "Take a photo" has background "#1c1b1a"

  Scenario: Arriving for the first time
    Given I open huemi
    Then I see the heading "One piece you own. The rest that goes with it."

  # Versions before ADR 0017 logged every corrected reading on the phone.
  Scenario: A correction log left by an earlier version is deleted
    Given an earlier version left a correction log
    And I have seen the welcome screen
    When I open huemi
    Then no correction log is kept

  # The two ways in are the start screen's content, so they take its space.
  Scenario: The two ways in fill the start screen
    Given I have seen the welcome screen
    And I open huemi
    Then the button "Take a photo" is at least 200 tall
    And the button "Pick a color" is at least 200 tall
