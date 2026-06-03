Feature: Sessions endpoints

  Background:
    * url baseUrl

  Scenario: POST /api/sessions creates a new session in WAITING status
    Given path '/api/sessions'
    When method POST
    Then status 201
    And match response.sessionCode == '#string'
    And match response.status == 'WAITING'
    And match response.currentRoomId == 1
    And match response.score == 100
    And match response.serviceHealth == 100
    And match response.completed == false
    And match response.players == '#[]'

  Scenario: Full session lifecycle - create, join, start, get state
    # Create
    Given path '/api/sessions'
    When method POST
    Then status 201
    * def code = response.sessionCode

    # Join
    Given path '/api/sessions/' + code + '/join'
    And request { playerName: 'Alice' }
    When method POST
    Then status 200
    And match response.sessionCode == code

    # Start
    Given path '/api/sessions/' + code + '/start'
    When method POST
    Then status 200
    And match response.status == 'IN_PROGRESS'

    # Get state
    Given path '/api/sessions/' + code + '/state'
    When method GET
    Then status 200
    And match response.sessionCode == code
    And match response.status == 'IN_PROGRESS'
    And match response.players[0].name == 'Alice'

  Scenario: GET /api/sessions/UNKNOWN/state returns 404
    Given path '/api/sessions/ZZZZZZ/state'
    When method GET
    Then status 404

  Scenario: GET /api/sessions/{code}/activity returns empty list on new session
    Given path '/api/sessions'
    When method POST
    Then status 201
    * def code = response.sessionCode

    Given path '/api/sessions/' + code + '/activity'
    When method GET
    Then status 200
    And match response == '#[]'
