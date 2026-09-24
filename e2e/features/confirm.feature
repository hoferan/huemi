Feature: Confirming the color

  After a photo, huemi shows the color it read. The user can accept it,
  correct it without starting over, choose among a pattern's colors, or tap
  the garment when the photo is too busy to read.

  Background:
    Given I have seen the welcome screen

  Scenario: Accepting the reading
    Given my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    Then I see the heading "Is this the color?"
    And I see "We read" on the reading
    When I press "Looks right"
    Then I see the heading "Goes with it"

  Scenario: Correcting the reading
    Given my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    And I press "Not quite"
    And I choose the nearby color "Navy"
    Then I see "Your correction" on the reading
    When I press "Use this color"
    Then I see the heading "Goes with it"
    And the base block is named "Top: Navy"

  Scenario: A patterned garment asks which color
    Given my camera shows a striped garment
    When I open the camera for the top
    And I take a photo
    Then I see the heading "Which color is it?"
    When I press "Use Navy"
    Then I see the heading "Goes with it"

  Scenario: The selected swatch is outlined
    Given my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    And I press "Not quite"
    Then only the pressed button in "Closer to one of these?" is outlined

  Scenario: The lightness slider is drawn in ink
    Given my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    And I press "Not quite"
    Then the "Lighter or darker" slider's accent color is "#151413"

  Scenario: The selected choice is outlined
    Given my camera shows a striped garment
    When I open the camera for the top
    And I take a photo
    And I see the heading "Which color is it?"
    Then only the pressed button in "Which color is it?" is outlined

  Scenario: A busy photo asks for a tap
    Given my camera shows a busy scene
    When I open the camera for the top
    And I take a photo
    Then I see the heading "Tap your garment"
    When I tap the garment on the photo
    Then I see the heading "Is this the color?"

  Scenario: A landscape phone keeps the reading's buttons on screen
    Given my screen is 844 by 390
    And my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    Then "Looks right" is on screen without scrolling

  Scenario: A landscape phone keeps the way out of a busy photo on screen
    Given my screen is 844 by 390
    And my camera shows a busy scene
    When I open the camera for the top
    And I take a photo
    Then "We couldn't tell which color is the garment. Tap it on your photo." is on screen without scrolling
    And "Pick by hand" is on screen without scrolling

  Scenario: Reloading has nothing to confirm
    Given my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    And I reload the page
    Then I see the heading "Frame the garment"

  Scenario: Starting from the entry screen
    Given my camera shows a plain garment
    And I open huemi
    When I press "Take a photo"
    Then I see the heading "Choose a garment"
    When I choose the slot "Top"
    Then I see the heading "Frame the garment"

  Scenario Outline: Each state passes the accessibility checks
    Given my camera shows <scene>
    When I open the camera for the top
    And I take a photo
    And I see the heading "<heading>"
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44

    Examples:
      | scene              | heading            |
      | a plain garment    | Is this the color? |
      | a striped garment  | Which color is it? |
      | a busy scene       | Tap your garment   |

  Scenario: The open correction panel passes the accessibility checks
    Given my camera shows a plain garment
    When I open the camera for the top
    And I take a photo
    And I press "Not quite"
    Then the screen has no detectable accessibility violations
    And every link and button is at least 44 by 44
