Feature: Field recorder

  Developer mode records real garments under real light, keeps every frame in
  IndexedDB and exports the lot as one gzipped file. No unit test can open
  IndexedDB or CompressionStream, so these are where the store and the
  export run for real.

  Scenario: A garment and a capture survive a reload
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I add the garment "grey hoodie" with one color
    And I capture it in "Lamp"
    And I reload the page
    Then the garment "grey hoodie" has 1 capture
    And the screen has no detectable accessibility violations

  Scenario: The capture screen says what it recorded
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I add the garment "grey hoodie" with one color
    And I capture it in "Lamp"
    Then the toast says "Captured: Lamp."
    And the screen has no detectable accessibility violations

  Scenario: Recording from the confirm screen
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I photograph a top and turn on Record in "Dim"
    And I accept the reading
    Then the toast says "Capture recorded."
    And the field recorder lists 1 capture from normal use
    And the screen has no detectable accessibility violations

  Scenario: The export holds every capture's frame
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    And my browser has no share sheet
    When I add the garment "grey hoodie" with one color
    And I capture it in "Lamp"
    And I export the field set
    Then the download "huemi-field-<today>.json.gz" unzips to version 1 with 1 garment and 1 capture
    And that capture's frame has width × height × 4 bytes
    And the centre of that frame is "#4a6285"

  Scenario: Deleting a garment removes its captures from the export
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    And my browser has no share sheet
    When I add the garment "grey hoodie" with one color
    And I capture it in "Lamp"
    Then the field store holds 1 frame
    When I delete the garment "grey hoodie"
    Then Export is disabled
    And the field store holds 0 frames

  Scenario: A capture from normal use, once linked, survives a reload
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I add the garment "grey hoodie" with one color
    And I photograph a top and turn on Record in "Dim"
    And I accept the reading
    Then the toast says "Capture recorded."
    When I link the capture from normal use to "grey hoodie"
    And I reload the page
    Then the garment "grey hoodie" has 1 capture

  Scenario: A capture deleted on its garment's page stays deleted
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I add the garment "grey hoodie" with one color
    And I capture it in "Lamp"
    And I delete the one capture of "grey hoodie"
    And I reload the page
    Then the garment "grey hoodie" has 0 captures
