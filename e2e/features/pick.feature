Feature: Picking a color

  The picker is the first screen since milestone one to render colors that are
  runtime values rather than tokens, which is what StyleX's dynamic styles were
  chosen for.

  Scenario: The palette renders its colors
    Given I have seen the welcome screen
    And I open the picker for the top
    Then the swatch "Navy" has background "#1f2a44"
    And the swatch "Cream" has background "#e9dfc9"
