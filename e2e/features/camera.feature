Feature: Framing a garment

  The camera screen ships before anything links to it, so these scenarios
  reach it by URL or through slot choice's camera route.

  Background:
    Given I have seen the welcome screen

  Scenario: Choosing a slot on the way to the camera
    Given my camera shows a bright scene
    When I choose the slot "Top" on the way to the camera
    Then I see the heading "Frame the garment"

  Scenario: A working camera shows the shutter and no warning
    Given my camera shows a bright scene
    When I open the camera for the top
    Then I see the button "Take photo"
    And I do not see the low-light warning

  Scenario: A dark scene warns and offers a way out
    Given my camera shows a dark scene
    When I open the camera for the top
    Then I see the low-light warning
    And I see the link "Pick by hand"
    And I see the button "Take photo"

  Scenario: A blocked camera falls back to picking by hand
    Given my camera is blocked
    When I open the camera for the top
    Then I am told "huemi can't see your camera"
    When I follow the link "Pick by hand"
    Then I see the heading "Pick a color"
