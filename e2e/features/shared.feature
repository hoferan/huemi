Feature: A shared outfit

  Someone opens a link a friend shared. They have none of the sender's
  context, and often have never opened huemi, so most of these scenarios start
  with no onboarding flag: the screen shows the outfit as it was sent and
  offers a way to keep it and a way into the app.

  Scenario: A shared link shows the outfit as sent, to someone new
    When I open the shared link "/shared?top=c39a3a&bottom=1f2a44&shoes=c9a57e&base=top"
    Then the block "Top" has background "#c39a3a"
    And the block "Bottom" has background "#1f2a44"
    And the block "Shoes" has background "#c9a57e"

  Scenario: Saving a shared outfit keeps it
    When I open the shared link "/shared?top=c39a3a&bottom=1f2a44&base=top"
    And I press "Save this outfit"
    Then the toast says "Saved"
    When I open the saved outfits
    Then I see a saved outfit named "Mustard top"

  Scenario: Someone new starts from a shared outfit at the welcome
    When I open the shared link "/shared?top=c39a3a&base=top"
    And I press "Try your own colors"
    Then I am on the welcome screen

  Scenario: Someone who knows huemi starts from a shared outfit at the start
    Given I have seen the welcome screen
    When I open the shared link "/shared?top=c39a3a&base=top"
    And I press "Try your own colors"
    Then I am on the start screen

  Scenario: A link that cannot be read goes to the start
    Given I have seen the welcome screen
    When I open the shared link "/shared?top=zzzzzz"
    Then I am on the start screen
