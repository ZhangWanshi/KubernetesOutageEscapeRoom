Feature: Rooms endpoints

  Background:
    * url baseUrl

  Scenario: GET /api/rooms returns 3 rooms
    Given path '/api/rooms'
    When method GET
    Then status 200
    And match response == '#[3]'
    And match response[0].roomId == 1
    And match response[1].roomId == 2
    And match response[2].roomId == 3

  Scenario: GET /api/rooms/1 returns room details with evidence and actions
    Given path '/api/rooms/1'
    When method GET
    Then status 200
    And match response.roomId == 1
    And match response.evidence == '#notnull'
    And match response.actions == '#notnull'
    And match response.evidence == '#[_ > 0]'
    And match response.actions == '#[_ > 0]'

  Scenario: GET /api/rooms/99 returns 404 for unknown room
    Given path '/api/rooms/99'
    When method GET
    Then status 404
