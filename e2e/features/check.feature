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

  Scenario: The result describes the outfit
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Navy"
    And I press "How does it work together?"
    Then I am taken to the result
    And the check says "Warm and cool together: the cream top and the navy trousers."
    And I see the button "Top: Cream, swap"
    And I see the button "Bottom: Navy, swap"

  Scenario: Swapping a piece and putting it back
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Navy"
    And I press "How does it work together?"
    And I press "Bottom: Navy, swap"
    And I choose "Charcoal" in the sheet
    Then I see the button "Bottom: Charcoal, swapped, swap"
    When I press "Bottom: Charcoal, swapped, swap"
    And I choose "Yours, Navy" in the sheet
    Then I see the button "Bottom: Navy, swap"

  Scenario: A swap is a what-if, not a change to the list
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Navy"
    And I press "How does it work together?"
    And I press "Bottom: Navy, swap"
    And I choose "Charcoal" in the sheet
    And I press "Change pieces"
    Then I see the button "Bottom: Navy"

  Scenario: Checking another outfit
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Navy"
    And I press "How does it work together?"
    And I press "Check another"
    Then I see the heading "Frame the outfit"

  Scenario: The start screen links to the check
    Given my camera shows an outfit
    And I open huemi
    When I press "Already dressed? Check your outfit"
    Then I see the heading "Frame the outfit"

  Scenario: The result and its swap sheet pass the accessibility checks
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Navy"
    And I press "How does it work together?"
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44
    When I press "Bottom: Navy, swap"
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44

  Scenario: A block is drawn in its color
    Given my camera shows an outfit
    When I open the outfit check
    And I follow the link "Enter the colors"
    And I set "Top: not set" to "Cream"
    And I set "Bottom: not set" to "Rust"
    And I press "How does it work together?"
    Then the block "Bottom: Rust" is filled with "#a4522d"
