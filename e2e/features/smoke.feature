Feature: Spike screen

  The spike screen is the first thing huemi renders: two color blocks, Navy
  and Cream, proving the rendering pipeline works before any real screen
  exists.

  Scenario: Viewing the spike screen's color blocks
    Given I open huemi
    Then I see a color block named "Navy" with background color "#1f2a44"
    And I see a color block named "Cream" with background color "#e9dfc9"
