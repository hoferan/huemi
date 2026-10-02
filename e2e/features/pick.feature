Feature: Picking a color

  The picker is the first screen since milestone one to render colors that are
  runtime values rather than tokens, which is what StyleX's dynamic styles were
  chosen for.

  Scenario: The palette renders its colors
    Given I have seen the welcome screen
    And I open the picker for the top
    Then the swatch "Navy" has background "#1f2a44"
    And the swatch "Cream" has background "#e9dfc9"

  Scenario: Each swatch prints its name
    Given I have seen the welcome screen
    And I open the picker for the top
    Then every swatch shows its name

  # The brief asks for colors shown large. The swatches share the height the
  # screen has, so a phone gets tiles about twice the 44px minimum.
  Scenario: The swatches fill the screen
    Given I have seen the welcome screen
    And I open the picker for the top
    Then the choices fill the screen, each at least 64 tall

  Scenario: The garments fill the screen
    Given I have seen the welcome screen
    And I open the garment choice
    Then the choices fill the screen, each at least 96 tall
