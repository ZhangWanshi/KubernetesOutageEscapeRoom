Feature: Health endpoint

  Background:
    * url baseUrl

  Scenario: GET /api/health returns 200 with status UP
    Given path '/api/health'
    When method GET
    Then status 200
    And match response.status == 'UP'
    And match response.service == 'escape-room-backend'
