Feature: Guided runs

  Developer mode offers two runs that turn a person's answers into data for
  the benchmarks. They write to IndexedDB, so the saves, the undos and the
  deletes only run for real here, and the vote card's colors are StyleX, which
  produces no CSS under Vitest (ADR 0002).

  Scenario: A reading run of 10 records 10 judged captures
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I start a reading run of 10 under "Lamp"
    And I answer Yes to 9 readings
    And I answer No to a reading and pick a neighbouring color
    Then the summary says "9 of 10 right under Lamp"
    And the screen has no detectable accessibility violations
    And the field recorder lists 10 captures from guided runs

  Scenario: Undo takes back the last answer
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I start a reading run of 10 under "Lamp"
    And I answer Yes to 3 readings
    And I take back the last answer
    Then the field recorder lists 2 captures from guided runs
    And the screen has no detectable accessibility violations

  Scenario: A matching run exports its votes
    Given I have seen the welcome screen
    And developer mode is on
    And my browser has no share sheet
    When I start a matching run of 10
    And I answer Yes to 10 pairs
    Then the summary says "You liked 10 of 10"
    When I export the field set
    Then the download "huemi-field-<today>.json.gz" unzips to version 2 with 0 garments and 0 captures
    And that export holds 10 pair votes
    And the screen has no detectable accessibility violations

  Scenario: Undo takes back a vote
    Given I have seen the welcome screen
    And developer mode is on
    When I start a matching run of 10
    And I answer Yes to 3 pairs
    And I take back the last answer
    Then the field recorder counts 2 pair votes
    And the screen has no detectable accessibility violations

  Scenario: The vote card's colors are the pair's colors
    Given I have seen the welcome screen
    And developer mode is on
    When I start a matching run of 10
    And I note the colors of the pair on the card
    And I answer Yes to 1 pair
    Then the stored vote holds the colors I saw on the card
    And the screen has no detectable accessibility violations

  Scenario: The field list deletes a run's captures and votes
    Given I have seen the welcome screen
    And developer mode is on
    And my camera sees a garment
    When I start a reading run of 10 under "Lamp"
    And I answer Yes to 2 readings
    And I start a matching run of 10
    And I answer Yes to 2 pairs
    Then the field recorder lists 2 captures from guided runs
    And the field recorder counts 2 pair votes
    When I delete the run captures
    Then the field recorder lists 0 captures from guided runs
    And the field recorder counts 2 pair votes
    When I delete the votes
    Then the field recorder counts 0 pair votes
    And the screen has no detectable accessibility violations
