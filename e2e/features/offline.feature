Feature: Working offline

  huemi is used at a wardrobe or in a changing room, where signal is often
  poor. After one visit the app opens without a connection, and where the
  browser supports it the entry screen offers to install the app.

  Scenario: Opening the app with no signal
    Given I have seen the welcome screen
    And I open huemi
    And the app is ready to work offline
    When I go offline
    And I reload the page
    Then I see the heading "Start with a garment"

  Scenario: Reloading a deep link with no signal
    Given I have seen the welcome screen
    And I open huemi
    And the app is ready to work offline
    When I go offline
    And I open "/saved" while offline
    Then I see the heading "Saved outfits"

  Scenario: Offering to install
    Given I have seen the welcome screen
    And I open huemi
    Then I do not see the button "Install huemi"
    When the browser offers to install the app
    Then I see the button "Install huemi"
    And every link and button is at least 44 by 44
    And the screen has no detectable accessibility violations
    When the app is installed
    Then I do not see the button "Install huemi"
