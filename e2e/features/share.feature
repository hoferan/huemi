Feature: Share

  An outfit leaves the app as a picture through the phone's own share sheet.
  jsdom has no canvas and no share sheet, so only a real browser proves the
  picture is the outfit on screen. Headless Chromium has no share sheet either,
  so each scenario sets up the device it needs.

  Background:
    Given I have seen the welcome screen

  # The picture is read back pixel by pixel down one column that crosses every
  # block clear of its text and its rounded corners.
  Scenario: Sharing hands over a picture of the outfit
    Given my phone can share files
    When I open the suggestions for a mustard top
    And I share the outfit
    Then a PNG named "huemi-outfit.png" of 1080 by 1350 is shared
    And the picture shows the blocks on screen, head to toe
    And each block's name is painted in the foreground the screen uses

  Scenario: The share names every piece
    Given my phone can share files
    When I open the suggestions for a mustard top
    And I share the outfit
    Then the shared text names every block on screen

  Scenario: A phone that cannot share files shares the names
    Given my phone can share only text
    When I open the suggestions for a mustard top
    And I share the outfit
    Then the share has no file and names every block on screen

  Scenario: Without a share sheet the picture downloads
    Given my browser has no share sheet
    When I open the suggestions for a mustard top
    Then sharing the outfit downloads "huemi-outfit.png"
    And the toast says "Image saved"

  Scenario: Closing the share sheet says nothing
    Given I will close the share sheet
    When I open the suggestions for a mustard top
    And I share the outfit
    Then the share sheet opened
    And no message appears
