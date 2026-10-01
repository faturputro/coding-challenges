# API Reference

REST endpoints and Socket.IO events of the Real-Time Vocabulary Quiz. For setup see [README.md](./README.md). For how these calls fit together see [data-flow.md](./data-flow.md).

- **Base URL:** `http://localhost:9000/api/v1` (production build), or `http://localhost:5173/api/v1` through the Vite dev proxy.
- **Format:** JSON request and response bodies (`content-type: application/json`), up to 1 MB.

---

## Conventions

### Response envelope

Every JSON response uses the same envelope.

**Success** (`200`):

```json
{
  "success": true,
  "request_id": "01890a5d-ac96-7b6c-8f2a-3c4d5e6f7a8b",
  "timestamp": 1790895583347,
  "data": { }
}
```

**Failure:**

```json
{
  "success": false,
  "code": "validation_failed",
  "message": "Please check your input",
  "request_id": "01890a5d-ac96-7b6c-8f2a-3c4d5e6f7a8b",
  "timestamp": 1790895583347,
  "data": { "name": ["The name may not be greater than 50 characters."] }
}
```

- `timestamp` is milliseconds since the Unix epoch.
- `request_id` identifies the request in the server logs.
- `data` is `null` when there is nothing to return. On `422` it holds field errors (`{ field: [messages] }`).
- `5xx` responses never include a message or internal details.

### Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `bad_request` | Invalid request or state (e.g. starting a session that already started), or malformed JSON (`"Invalid JSON body"`) |
| 400 | `duplicate_unique_resource` | A unique value already exists |
| 401 | `unauthorized`, `invalid_token`, `token_expired` | Missing cookie, cookie that can't be decrypted (tampered or from an old key), or expired cookie |
| 403 | `forbidden` | Authenticated but not allowed (e.g. answering without joining) |
| 404 | `not_found` | Unknown session, question or route |
| 409 | `conflict` | Conflicts with current state (already answered, quiz not running) |
| 422 | `validation_failed` | Input failed validation; see `data` |
| 413 | `bad_request` | Request body larger than 1 MB (`"Request body too large"`) |
| 429 | `too_many_requests` | Rate limit hit |
| 500 | `internal_server_error` | Unexpected error |

### Authentication

Both kinds of user are identified by **HttpOnly cookies** containing encrypted tokens (JWE). Browsers send them automatically, and the client never reads them.

| Cookie | Who | Issued by | Lifetime | Checked by |
|---|---|---|---|---|
| `adminsid` | Admin | `POST /auth/login` | 1 day (and a Redis session) | Endpoints marked **Admin** |
| `elsasid` | Anonymous player | `GET /session/init` | 1 year | Endpoints marked **Player** |

Call `GET /session/init` once before any **Player** endpoint or opening the socket.

---

## Health

### `GET /healthcheck`

Not under `/api/v1`. Liveness check for load balancers and Docker.

```json
{ "success": true, "data": { "status": "OK" } }
```

---

## Admin authentication

### `POST /auth/login`

Logs an admin in and sets the `adminsid` cookie. **Rate limited: 5 requests per minute per client.**

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, email |
| `password` | string | required |

**Response:** `200`, `data: null`, plus `Set-Cookie: adminsid=…; HttpOnly`.

| Error | Cause |
|---|---|
| 401 `unauthorized` "Invalid email/password" | Wrong email or password, or invalid input (deliberately the same message) |
| 429 | More than 5 attempts in a minute. This body is `{ "code": "too_many_requests", "message": "…" }` without the full envelope. |

### `GET /auth/profile` — Admin

Returns the logged-in admin.

```json
{ "data": { "id": 1, "email": "admin@mail.com" } }
```

| Error | Cause |
|---|---|
| 401 | No cookie, or the admin session has expired |

---

## Sessions (admin)

### `GET /session` — Admin

Lists sessions, newest first, **10 per page**.

**Query**

| Param | Type | Description |
|---|---|---|
| `page` | integer | 1-based page number (default 1) |
| `q` | string | Filter: name starts with `q` |

**Response**

```json
{
  "data": {
    "total": 13,
    "data": [
      { "code": "v3mke0cSoR", "name": "Morning vocab sprint", "status": "not_started", "created_at": "2026-10-01T17:49:36.751Z" }
    ]
  }
}
```

`status` is one of `not_started`, `in_progress`, `finished`.

### `POST /session` — Admin

Creates a session with a random 10-character join code.

**Body**

| Field | Type | Rules |
|---|---|---|
| `name` | string \| null | optional, max 50 characters |

**Response**

```json
{ "data": { "code": "v3mke0cSoR", "name": "Morning vocab sprint", "status": "not_started" } }
```

| Error | Cause |
|---|---|
| 422 | `name` longer than 50 characters |

### `PUT /session/:code/start` — Admin

Starts the session. It runs for **120 minutes** (`finished_at` = now + 120 min) and then ends automatically. Every player subscribed to the session receives `session:updated` with `reason: "started"`.

**Response:** `200`, `data: null`.

| Error | Cause |
|---|---|
| 400 "Session not found" | Unknown code |
| 400 "No players found" | Nobody has joined yet |
| 400 "Session already started" | Already started |
| 400 "Session already finished" | Already over |

---

## Players

### `GET /session/init`

Issues the anonymous player cookie `elsasid` (a random UUIDv7 user id) if the browser doesn't have a valid one. A missing, expired or undecryptable cookie is replaced. Safe to call repeatedly.

**Response:** `200`, `data: null`, plus `Set-Cookie: elsasid=…; HttpOnly` whenever a new cookie is issued.

If any **Player** endpoint returns `401 invalid_token`, call this again to get a fresh cookie.

### `GET /play/:code`

Public session details.

```json
{
  "data": {
    "id": 3, "code": "v3mke0cSoR", "name": "Morning vocab sprint", "status": "in_progress",
    "started_at": "2026-10-02T03:00:00.000Z", "finished_at": "2026-10-02T05:00:00.000Z",
    "participants": [{ "username": "alice" }]
  }
}
```

| Error | Cause |
|---|---|
| 400 "Invalid link or expired" | Unknown code |

### `POST /play/:code/join` — Player

Joins the session under a display name. The player is added to the leaderboard with 0 points, and subscribers receive `session:updated` (`reason: "player_joined"`) and `leaderboard:updated`. Joining again has no effect.

**Body**

| Field | Type | Rules |
|---|---|---|
| `username` | string | required, max 50 characters |

**Response:** `200`, `data: null`.

| Error | Cause |
|---|---|
| 401 | No `elsasid` cookie (call `/session/init` first) |
| 404 "Invalid link or expired" | Unknown code |
| 422 | Missing or too-long `username` |

### `GET /play/:code/questions` — Player

The session's questions **without** the correct answers, plus the player's progress (for resuming after a refresh). Only available while the session is running.

```json
{
  "data": {
    "questions": [
      {
        "id": 1,
        "question": "What does \"ephemeral\" mean?",
        "choices": [
          { "id": "a", "label": "Lasting for a very short time" },
          { "id": "b", "label": "Extremely large in size" }
        ]
      }
    ],
    "answers": { "1": "a" },
    "total_score": 100,
    "finished_at": "2026-10-02T05:00:00.000Z"
  }
}
```

`answers` maps question id → the choice this player submitted.

| Error | Cause |
|---|---|
| 401 | No `elsasid` cookie |
| 403 "Join the game before playing" | Player hasn't joined this session |
| 404 "Invalid link or expired" | Unknown code |
| 409 "The quiz has not started yet" / "The quiz has ended" | Session not running (status, or `finished_at` passed) |

### `POST /play/:code/questions/:questionId/answer` — Player

Submits one answer. Scored **on the server**: 100 points if correct, otherwise 0. **Only the first answer to each question counts.** Subscribers receive `leaderboard:updated`.

**Body**

| Field | Type | Rules |
|---|---|---|
| `answer` | string | required, a choice id of this question (`"a"`–`"z"`, case-insensitive) |

**Response**

```json
{ "data": { "correct": false, "points": 0, "total_score": 100, "correct_answer": "b" } }
```

`correct_answer` is revealed after answering so the player learns the right word.

| Error | Cause |
|---|---|
| 401 / 403 / 404 / 409 | As for `GET /play/:code/questions` |
| 404 "Question not found" | Unknown `questionId` |
| 409 "You already answered this question" | Not the first answer. `data` is `{ "answer": "<recorded choice>", "total_score": <n> }`. |
| 422 | Missing `answer`, or not one of this question's choices |

---

## Real-time (Socket.IO)

- **Connect:** same origin as the page, default path `/socket.io`, with cookies (`withCredentials: true`).
- **The handshake requires:**
  - a valid `elsasid` cookie, otherwise `connect_error` with message `unauthorized`;
  - an `Origin` listed in `SOCKET_ALLOWED_ORIGINS`, otherwise the connection is refused.

Rooms don't survive a reconnect, so **send `session:subscribe` again after every `connect`**.

### Client → server

#### `session:subscribe(code, ack)`

Joins the session's room (leaving any previous one) and returns the current state.

```json
{
  "ok": true,
  "session": {
    "code": "v3mke0cSoR", "name": "Morning vocab sprint", "status": "in_progress",
    "started_at": "2026-10-02T03:00:00.000Z", "finished_at": "2026-10-02T05:00:00.000Z",
    "total_players": 3
  },
  "player": { "id": 7, "username": "alice" },
  "leaderboard": [{ "rank": 1, "player_id": 7, "username": "alice", "score": 200 }]
}
```

- `player` is `null` if this browser hasn't joined yet.
- On failure: `{ "ok": false, "error": "Session not found" | "Invalid session code" | "Could not load the session" }`.

### Server → client

| Event | Payload | Sent when |
|---|---|---|
| `session:updated` | `{ reason: "player_joined" \| "started" \| "finished", session }` (same `session` shape as above) | A player joins, the admin starts the session, or it ends |
| `leaderboard:updated` | `{ leaderboard: [{ rank, player_id, username, score }] }`. The top 10; equal scores share a rank. | Scores or players change. At most one broadcast per 500 ms per session, plus a final one after a burst. |

The TypeScript contract for these events is `src/server/types/realtime.ts`.

