# Frontend API Connection Notes

The frontend is in:

```text
src/main/resources/static/
```

Spring Boot will serve:

```text
/index.html
```

## Connected endpoints

The JavaScript now calls these exact backend endpoints:

```text
POST /api/sessions
POST /api/sessions/{sessionId}/join
GET  /api/sessions/{sessionId}/room
POST /api/sessions/{sessionId}/submit
GET  /api/sessions/{sessionId}/result
```

## Flow

1. User enters player name.
2. If the Session ID field is empty, frontend calls:

```text
POST /api/sessions
```

3. Frontend then calls:

```text
POST /api/sessions/{sessionId}/join
```

4. Frontend fetches the current room:

```text
GET /api/sessions/{sessionId}/room
```

5. User clicks an action button.
6. Frontend submits the selected action:

```text
POST /api/sessions/{sessionId}/submit
```

7. If the backend says the game is finished, frontend calls:

```text
GET /api/sessions/{sessionId}/result
```

## Expected flexible response fields

The frontend accepts common response names, for example:

- `sessionId` or `id`
- `room` or `currentRoom`
- `score` or `currentScore`
- `health` or `serviceHealth`
- `correct`, `isCorrect`, or `success`
- `finished`, `gameFinished`, or `completed`
