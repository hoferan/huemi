Feature: Getting back and getting home

  Every screen after the start screen has a back arrow and the wordmark as a
  link home. The arrow always leads to the same screen, the one before it in
  the flow, whatever route led here. When that screen is already behind in
  history the arrow steps back to it, so the phone's own back button still
  leads somewhere sensible afterwards.

  Background:
    Given I have seen the welcome screen

  Scenario: The arrow steps back to the screen before
    Given I open huemi
    When I press "Pick a color"
    And I choose the slot "Top"
    Then I see the heading "Pick a color"
    When I follow the link "Back to Choose a garment"
    Then I see the heading "Choose a garment"
    When I use the phone's back button
    Then I see the heading "Start with a garment"

  Scenario: The arrow reaches past screens in between
    Given I open huemi
    When I press "Pick a color"
    And I choose the slot "Top"
    And I choose the swatch "Navy"
    Then I see the heading "Goes with it"
    When I follow the link "Back to Pick a color"
    Then I see the heading "Pick a color"
    When I follow the link "Back to Choose a garment"
    Then I see the heading "Choose a garment"

  Scenario: The arrow opens its screen when nothing is behind
    Given I open "/suggest?slot=top&hex=%23c39a3a"
    When I follow the link "Back to Pick a color"
    Then I see the heading "Pick a color"
    When I use the phone's back button
    Then I see the heading "Goes with it"

  Scenario: The wordmark goes home from deep in a flow
    Given I open huemi
    When I press "Pick a color"
    And I choose the slot "Top"
    And I choose the swatch "Navy"
    And I follow the link "huemi, home"
    Then I see the heading "Start with a garment"

  Scenario: The bar passes the accessibility checks
    Given I open "/check/pieces"
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44
