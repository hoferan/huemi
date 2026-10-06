Feature: Developer mode

  A hidden mode for the people who build huemi. Seven taps on the wordmark and a
  passphrase turn it on, and it adds a chip and a menu without changing what
  anyone else sees. The build the suite runs against carries the hash of
  "e2e passphrase" (e2e/devMode.ts).

  Scenario: Seven taps and the passphrase turn developer mode on
    Given I have seen the welcome screen
    And I open huemi
    When I tap the wordmark 7 times
    And I enter the developer passphrase
    Then the toast says "Developer mode on"
    And I see the developer chip

  Scenario: A wrong passphrase leaves it off
    Given I have seen the welcome screen
    And I open huemi
    When I tap the wordmark 7 times
    And I enter the passphrase "nope"
    Then I see "That passphrase is not right."
    And I do not see the developer chip

  Scenario: A locked /dev is not found
    Given I have seen the welcome screen
    When I open "/dev"
    Then I see the heading "Page not found"

  Scenario: The menu is reachable and accessible while on
    Given I have seen the welcome screen
    And developer mode is on
    When I open "/dev"
    Then I see the heading "Developer mode"
    And the menu names the commit and date of the build
    And the screen has no detectable accessibility violations

  Scenario: Locking from the menu
    Given I have seen the welcome screen
    And developer mode is on
    When I open "/dev"
    And I press "Lock developer mode"
    Then the toast says "Developer mode off"
    And I do not see the developer chip

  Scenario: The menu names the offline cache
    Given I have seen the welcome screen
    And developer mode is on
    When I open "/dev" and the offline worker is ready
    Then the Offline section lists a cache starting "huemi-"

  # The chip sits beside the back arrow, so the wordmark must stay in the middle
  # of the bar however full the header is.
  Scenario: The chip leaves the wordmark centred
    Given I have seen the welcome screen
    And developer mode is on
    When I open "/suggest?slot=top&hex=%23c39a3a"
    Then I see the developer chip
    And the home link is centred in the bar
