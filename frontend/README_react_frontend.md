# React Frontend Files

This converts the existing frontend from plain JavaScript DOM manipulation to React.

## Put these files in

```text
src/main/resources/static/
```

Use:

```text
index.html
app.jsx
styles.css
```

You can remove or ignore the old:

```text
app.js
```

because the new `index.html` loads `app.jsx`.

## Important

This version uses React from a CDN, so you do not need npm, Vite, Webpack, or a separate frontend build.

## API endpoints used

```text
POST /api/sessions
POST /api/sessions/{sessionId}/join
GET  /api/sessions/{sessionId}/room
POST /api/sessions/{sessionId}/submit
GET  /api/sessions/{sessionId}/result
```

## Theme behaviour

The React app changes the body class depending on the current screen:

```text
screen-join
screen-room
screen-final
```

This works with your current time-machine-to-jungle `styles.css`.
