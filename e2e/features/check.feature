Feature: Capturing an outfit to check

  The user photographs what they are wearing and taps each piece, or enters
  each piece's color by hand. Both routes end on one list, and the list
  leads to the result. The start screen links here for someone already dressed.

  Background:
    Given I have seen the welcome screen

  Scenario: Photographing an outfit and tapping each piece
    Given my camera shows an outfit
    When I open the outfit check
    And I take a photo of the outfit
    Then I see the heading "Tap your jacket or coat, 1 of 4"
    When I tap piece 1 on the photo
    And I tap piece 2 on the photo
    And I tap piece 3 on the photo
    And I tap piece 4 on the photo
    Then I see the heading "What are you wearing?"
    And I see the button "Outerwear: Charcoal"
    And I see the button "Top: Cream"
    And I see the button "Bottom: Rust"
    And I see the button "Shoes: Burgundy"

  Scenario: Skipping a piece
    Given my camera shows an outfit
    When I open the outfit check
    And I take a photo of the outfit
    And I press "Skip"
    And I tap piece 2 on the photo
    And I tap piece 3 on the photo
    And I tap piece 4 on the photo
    Then I see the button "Outerwear: not set"
    And I see the button "Top: Cream"

  Scenario: Entering the colors by hand
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    Then I see the heading "What are you wearing?"
    When I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Navy"
    And I press "How does it work together?"
    Then I am taken to the result

  Scenario: A blocked camera offers entering the colors
    Given my camera is blocked
    When I open the outfit check
    Then I am told "huemi can't see your camera"
    And I see the link "Enter the colors"

  Scenario: A set row is drawn in its color
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Rust"
    Then the row "Top: Rust" is filled with "#a4522d"

  Scenario: The tap screen and the list pass the accessibility checks
    Given my camera shows an outfit
    When I open the outfit check
    And I take a photo of the outfit
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44
    When I tap piece 1 on the photo
    And I tap piece 2 on the photo
    And I tap piece 3 on the photo
    And I tap piece 4 on the photo
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44

  Scenario: The open palette sheet passes the accessibility checks
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I press "Top: not set"
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44
