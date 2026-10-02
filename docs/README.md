# Real-Time Vocabulary Quiz

A real-time quiz for an English learning app. An admin creates a quiz session and shares a join link. Players join anonymously with a display name, answer vocabulary questions while the session runs, and watch a live leaderboard.

- How data moves through the system: **[data-flow.md](./data-flow.md)**
- REST endpoints and Socket.IO events: **[api.md](./api.md)**
- The original challenge brief: [../README.md](../README.md)

> [!IMPORTANT]
> **Not yet implemented.** Because of time limits, this project does not yet include the following components:
>
> 1. **End-to-end tests.** The flows were checked manually in a headless browser, but no automated browser tests are committed (for example Playwright: admin creates and starts a game, two players join, answer, and see the leaderboard update).
> 2. **Integration tests.** The suite is unit tests with stubs, plus one opt-in test of the Redis scripts against a disposable Redis. There are no tests against real PostgreSQL + Redis + HTTP + Socket.IO together.
> 3. **Load tests.** None yet, for example k6 or Artillery simulating many concurrent sockets and answer submissions to measure p99 latency and leaderboard broadcast lag.
> 4. **Live observability and alerting.** OpenTelemetry → OpenObserve is wired up (see [Observability](#4-observability)) but not running against a live OpenObserve instance. Planned alerts sent to a **Discord channel**: any **5xx** response, and **p99 latency** above a threshold.
> 5. **Amazon SQS.** The message queue is **BullMQ on Redis** for now. The target design uses SQS. Note that SQS can delay a message by at most 15 minutes, so ending sessions on time would need EventBridge Scheduler.
> 6. **CI/CD.** Planned with **GitHub Actions**: build the Docker image and push it to **Amazon ECR**, then deploy to **Amazon ECS** (Fargate), which pulls the image from ECR. Environment variables and secrets (the `.env` values) come from **AWS SSM Parameter Store** through the ECS task definition.

---

## 1. Running the project

### Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 20.x (`engines: >=20`) | |
| PostgreSQL | 15 | Any recent version works. |
| Redis | 8.x | Any 6.2+ works. No Redis 7-only commands are used. |

### First-time setup

```sh
npm install
cp .env.example .env
```

Edit `.env`:

- Set `DB_USER` / `DB_PASSWORD` (and `DB_HOST` / `DB_PORT` if they differ).
- **Generate your own `APP_PKCS8_KEY`.** See [Secure tokens with JWE](#secure-tokens-with-jwe-jose--pkcs8) below. Do not reuse the example key.

#### Secure tokens with JWE (JOSE + PKCS8)

The player (`elsasid`) and admin (`adminsid`) cookies hold tokens that are **encrypted**, not just signed. They use JWE via [JOSE](https://github.com/panva/jose): RSA-OAEP-256 wraps the key, and A256GCM encrypts the content. The browser can't read or alter what's inside, such as the player's id. The server decrypts each token with the private key in `APP_PKCS8_KEY`, and `jose` requires that key in **PKCS#8** format.

Generate a 2048-bit RSA key in PKCS#8 format:

```sh
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keypair.pem
```

> Use `genpkey`, not `genrsa`. On macOS the built-in `/usr/bin/openssl` is LibreSSL, and its `genrsa` writes PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`). The server rejects that with `"pkcs8" must be PKCS#8 formatted string`. `genpkey` always writes PKCS#8 (`-----BEGIN PRIVATE KEY-----`).

Print the key on one line and paste it as the value of `APP_PKCS8_KEY` in `.env`:

```sh
tr -d '\n' < keypair.pem
```

```sh
# example
APP_PKCS8_KEY=-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgkqhkiG9w0BAQEFAASC......-----END PRIVATE KEY-----
```

Keep the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` markers exactly as printed (spaces, not underscores). Then delete `keypair.pem` or store it in a secrets manager. `*.pem` files are git-ignored, but the key must never be committed. Changing the key invalidates every existing cookie, so players and admins will need to rejoin or log in again.

#### Database

Create the database, run the migration and seed it:

```sh
npm run db:create
npm run db:migrate
npx sequelize-cli db:seed --seed 20261001000000-quiz-questions.js     # 10 vocabulary questions
npx sequelize-cli db:seed --seed 20261001182212-create_admin_account.js
```

> Run each seeder **once**. The Sequelize config does not record which seeders have run, so `npm run db:seed` (`db:seed:all`) would insert the questions again.

### Development

PostgreSQL and Redis must be running.

```sh
npm run dev
```

This starts three processes:

| Process | What it is | URL |
|---|---|---|
| `dev:server` | Express API + Socket.IO (nodemon, restarts on change) | http://localhost:9000 |
| `dev:worker` | BullMQ workers: persists answers, finishes sessions | none |
| `dev:client` | Vite dev server for the Vue app; proxies `/api` and `/socket.io` to `:9000` | **http://localhost:5173** |

Open the app through **http://localhost:5173**. Socket connections are only accepted from origins listed in `SOCKET_ALLOWED_ORIGINS`, and other addresses such as `127.0.0.1` or a LAN IP are rejected unless you add them there.

### Trying it end to end

1. Go to http://localhost:5173/login and sign in with the seeded admin: `admin@mail.com`, password as defined in `seeders/20261001182212-create_admin_account.js`.
2. On **/dashboard**, click **New Game**, name it, and use the copy button to copy the join link (`/play/<code>`).
3. Open the link in one or more other browsers or private windows. Each one is a separate anonymous player, and each picks a name.
4. Back on the dashboard, press the round **▶ Play** button on the session to start it.
5. Players get questions immediately, and every answer updates the leaderboard on all screens.
6. The session ends automatically after `DEFAULT_SESSION_DURATION_MINUTE` (120 minutes). The worker must be running for this.

### Docker

`docker-compose.yml` runs the whole stack: PostgreSQL, Redis, a one-off `migrate` step, the API (with the built Vue app) and the worker. It reads `.env`; only `APP_PKCS8_KEY` is required.

```sh
docker compose up --build        # app on http://localhost:9000 (override with API_PORT=9001)
docker compose run --rm migrate npx sequelize-cli db:seed --seed 20261001000000-quiz-questions.js
docker compose run --rm migrate npx sequelize-cli db:seed --seed 20261001182212-create_admin_account.js
docker compose --profile observability up --build   # also starts OpenObserve on :5080
```

PostgreSQL and Redis are not published to the host, so they don't clash with local instances. Stop `npm start` / `npm run dev` first if they're using port 9000.

### Production build

```sh
npm run build          # typecheck + build client (dist/client) + build server (dist/server)
npm start              # API + Socket.IO; also serves the built Vue app on PORT
npm run start:worker   # workers; run as a separate process
```

`npm start` and `npm run dev` both use `PORT` (9000 by default), so stop one before starting the other.

### Tests

```sh
npm test               # build, then run tests/*.cjs with node:test
```

The tests use stubs and in-memory servers. They need no database, no Redis and no running app. One integration test runs the Redis Lua scripts against a real Redis. It is **skipped** unless you point it at a disposable instance. The test runs `FLUSHDB`, so never use a shared Redis:

```sh
redis-server --port 16399 --save '' --appendonly no &
QUIZ_TEST_REDIS_URL=redis://127.0.0.1:16399 node --test tests/*.cjs
```

| Test file | Covers |
|---|---|
| `quizPlayService.cjs` | Scoring on the server, first answer only, input validation, session/join rules, no `is_correct` leak |
| `quizAnswerRepository.cjs` | Lua scripts: 50 concurrent submissions score exactly once, leaderboard, TTLs (needs `QUIZ_TEST_REDIS_URL`) |
| `leaderboardService.cjs` | Competition ranking (1, 1, 3) and broadcast throttling per session |
| `sessionService.cjs` | Join/start/finish broadcasts, finish scheduling, finishing is safe to repeat |
| `socket.cjs` | Socket auth (cookie + `Origin` allowlist), subscribe replies, room isolation |
| `apiErrors.cjs` | HTTP error handling: tampered cookies give 401, malformed/oversized JSON give JSON 400/413, `/session/init` replaces invalid cookies, no player ids in public session details |

### npm scripts

| Script | Description |
|---|---|
| `dev` | Server, worker and Vite together |
| `typecheck` | `vue-tsc --noEmit` over server and client |
| `build` / `build:client` / `build:server` | Production build (Vite for the client, SWC for the server) |
| `start` / `start:worker` | Run the built API / worker with `NODE_ENV=production` |
| `test` | Build, then run the test suite |
| `db:create` / `db:migrate` / `db:migrate:undo` / `db:status` | Sequelize CLI database tasks |
| `db:seed` / `db:seed:undo` | Run / undo **all** seeders (see the note above) |

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `9000` | API port. If changed, update the proxy target in `config/vite.config.ts`. |
| `NODE_ENV` | | `development` enables verbose SQL logging. |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | see `.env.example` | PostgreSQL connection |
| `DB_TEST_NAME` | `quiz_test` | Database used by Sequelize CLI with `NODE_ENV=test` |
| `REDIS_HOST` `REDIS_PORT` `REDIS_DB` `REDIS_PASSWORD` | `localhost` `6379` `0` | Redis connection (game state, Socket.IO, queues, rate limits) |
| `APP_PKCS8_KEY` | **required** | RSA private key (PKCS#8) used to encrypt the cookie tokens |
| `SOCKET_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:<PORT>` | Comma-separated origins allowed to open a socket |
| `SUBMISSION_WORKER_CONCURRENCY` | `5` | Parallel answer-persistence jobs per worker; keep at or below the DB pool size |
| `LOG_LEVEL` | `info` | Winston log level |
| `OTEL_SERVICE_NAME` | `elsa` (`elsa-worker` for the worker) | Service name in OpenObserve |
| `OPENOBSERVE_URL` `OPENOBSERVE_ORG` | `default` org | OpenObserve endpoint; telemetry is sent to `<url>/api/<org>/v1/*` |
| `OPENOBSERVE_EMAIL` `OPENOBSERVE_PASSWORD` | | OpenObserve credentials (basic auth). Telemetry is off unless URL, email and password are all set. |
| `OPENOBSERVE_DEBUG` | `false` | Print OpenTelemetry diagnostics |
| `VITE_OPENOBSERVE_CLIENT_TOKEN` `VITE_OPENOBSERVE_SITE` `VITE_OPENOBSERVE_ORG` `VITE_OPENOBSERVE_APP_ID` | | Browser RUM + logs, baked in at build time; off unless token and site are set |

---

### Deployment architecture (AWS)

![AWS deployment architecture](./images/aws-architecture.png)

The target deployment on AWS: traffic passes through **Cloudflare** (DNS, DDoS protection) to an **Elastic Load Balancer**, which spreads it across the API containers on **ECS Fargate** (images from ECR). The containers use **Aurora** (PostgreSQL), **ElastiCache** (Redis) and **SQS**, which would replace BullMQ as the message queue. Their environment variables and secrets come from **AWS SSM Parameter Store**. See [data-flow.md](./data-flow.md) for how requests and messages move between these components.

---

## 2. Folder structure

```
.
├── config/                     # Tool configuration
│   ├── vite.config.ts          #   Vue build + dev proxy (/api, /socket.io → :9000)
│   ├── sequelize.config.js     #   Sequelize CLI (migrations/seeders) connection
│   ├── tailwind.config.js      #   Theme tokens; note: only `md` and `lg` breakpoints
│   └── postcss.config.js
├── migrations/                 # Database schema (single migration creating all tables)
├── seeders/                    # 10 vocabulary questions, admin account
├── docs/                       # This documentation
├── graphify-out/               # Codebase knowledge graph for AI assistants (see section 5)
├── tests/                      # node:test suites (*.cjs)
└── src/
    ├── client/                 # Vue 3 single-page app
    │   ├── main.ts             #   Mounts the app, registers the anonymous player cookie
    │   ├── router.ts           #   /login, /dashboard (admin), /play/:code (public)
    │   ├── pages/              #   LoginPage, DashboardPage, PlayPage
    │   ├── components/         #   SessionList, NewGameDialog, JoinGameDialog,
    │   │                       #   QuizRunner, Leaderboard, ui/ (button, card)
    │   └── lib/                #   api.ts (REST client), useSessionSocket.ts (Socket.IO),
    │                           #   auth.ts, session.ts, clipboard.ts, sessionStatus.ts
    └── server/
        ├── index.ts            # API entry: HTTP server + Socket.IO + graceful shutdown
        ├── worker.ts           # Worker entry: BullMQ workers
        ├── server.ts           # Express app: middleware, controllers, static client
        ├── bootstrap.ts        # Connects PostgreSQL and Redis before starting
        ├── config/             # Env config, DB/Redis connection singletons, constants
        ├── controllers/        # HTTP routes (OvernightJS decorators), mounted at /api/v1
        ├── middlewares/        # Auth (admin / player cookie), rate limiter, logging, responses
        ├── services/           # Business logic: sessions, play/scoring, leaderboard, admin auth
        ├── repositories/       # Data access: PostgreSQL (Sequelize) and Redis (Lua scripts)
        ├── models/sql/         # Sequelize models
        ├── realtime/           # Socket.IO server setup and Redis event publisher
        ├── queues/             # BullMQ queue definitions and producers
        ├── workers/            # BullMQ processors
        ├── types/              # DTOs, interfaces, the shared socket contract (realtime.ts)
        └── utils/              # AppError, validator, JWE helpers, logger
```

**Layering.** Requests flow controller → service → repository. Services depend on interfaces (`types/*/interface.ts`), and the concrete classes are wired together in `repositories/repositories.containers.ts` and `services/services.containers.ts`. This is what lets the tests run services with in-memory stubs.

**Shared contract.** `src/server/types/realtime.ts` defines the socket events and payloads. The client imports it as a type-only import (`@server/types/realtime`), so both sides are checked against the same definitions.

---

## 3. Components and technologies

```mermaid
flowchart LR
  subgraph Browser
    V[Vue 3 SPA]
  end
  V -- REST /api/v1 --> API
  V <-- Socket.IO --> API
  subgraph Node
    API[API process<br/>Express + Socket.IO]
    W[Worker process<br/>BullMQ]
  end
  API <--> R[(Redis)]
  API <--> PG[(PostgreSQL)]
  API -- enqueue --> R
  R -- jobs --> W
  W --> PG
  W -- emit --> R
```

| Area | Technology | Why |
|---|---|---|
| **Frontend** | Vue 3 + Vite, vue-router, Tailwind CSS, radix-vue (dialogs), lucide icons | Fast builds and a component model that suits live-updating views. radix-vue provides accessible dialogs (focus trap, Esc handling). |
| **HTTP API** | Express 4 + OvernightJS decorators, helmet, cookie-parser | Simple and well understood. Decorators keep routes next to their handlers. |
| **Real-time** | Socket.IO 4 + `@socket.io/redis-adapter` + `@socket.io/redis-emitter` | Rooms per session, automatic reconnection and acknowledgements. The Redis adapter lets any number of API instances share rooms, and the emitter lets the worker broadcast without running a socket server. |
| **Database** | PostgreSQL + Sequelize (sequelize-typescript), migrations via sequelize-cli | The durable record: admins, sessions, participants, questions, submissions and final summaries. Unique constraints make retried writes safe. |
| **Live state / cache** | Redis via ioredis | The source of truth **while a game runs**. Atomic Lua scripts handle "first answer wins" and score increments, and a sorted set holds the leaderboard. The question bank is also cached in process memory for 60 seconds. |
| **Message queue** | BullMQ (on Redis) | Takes PostgreSQL writes off the answer path (`quiz-submission`) and schedules session end at `finished_at` (`session-lifecycle`, delayed job). Retries with exponential backoff. |
| **Auth** | `jose` (JWE, RSA-OAEP-256 + A256GCM), bcryptjs | Players are anonymous: `GET /session/init` issues an encrypted, HttpOnly `elsasid` cookie holding a UUIDv7. Admins log in with bcrypt-hashed passwords and receive an `adminsid` cookie that is also checked against Redis. |
| **Protection** | express-rate-limit + rate-limit-redis, Socket.IO `Origin` allowlist | The login is limited to 5 attempts per minute. Sockets from other origins are refused, because CORS does not apply to WebSockets. |
| **Observability** | OpenTelemetry → OpenObserve, Winston, OpenObserve browser RUM | Traces, metrics and logs from the API and the worker, plus real-user monitoring from the browser. See [Observability](#4-observability). |
| **Tooling** | TypeScript, SWC (server build), vue-tsc, node:test | |

### What lives where

| Data | PostgreSQL | Redis |
|---|---|---|
| Admin accounts | `admin` | `admin_session:<id>` (1 day) |
| Sessions | `quiz_session` (code, status, started_at, finished_at) | |
| Players | `quiz_participant` | `player_session:<uuid>`; `quiz:{<sessionId>}:players` (id → name) |
| Questions | `quiz_question` (choices as JSONB, incl. `is_correct`) | (in-process cache) |
| Answers | `quiz_submission` (written by the worker) | `quiz:{<sessionId>}:answers:<participantId>` |
| Scores | `quiz_summary` (written by the worker) | `quiz:{<sessionId>}:leaderboard` (sorted set) |
| Jobs | | `bull:quiz-submission:*`, `bull:session-lifecycle:*` |

---

## 4. Observability

The server uses OpenTelemetry and exports over OTLP/HTTP to **OpenObserve**. The browser uses OpenObserve's RUM SDK. It is **off in development** (`NODE_ENV=development`), and off when the OpenObserve variables aren't set.

### What is collected

| Signal | Source | Contents |
|---|---|---|
| **Traces** | `src/server/instrumentation.ts` (auto-instrumentation) | One trace per `/api` request, named by route (e.g. `POST /api/v1/play/:code/questions/:questionId/answer`), with child spans for PostgreSQL, Redis and Socket.IO. Static files and `/healthcheck` aren't traced. Only 5xx responses mark a span as an error (`middlewares/response.ts`). |
| **Logs** | Winston → `OpenTelemetryTransport` | Every application log, linked to the active trace. Also printed to the console as JSON. |
| **Metrics** | auto-instrumentation + `HostMetricsInstrumentation` + `src/server/utils/metrics.ts` | HTTP latency, CPU and memory, and app metrics: `app.quiz.answers.submitted` (by `correct`), `app.quiz.answers.rejected`, `app.quiz.players.joined`, `app.quiz.sessions.started` / `finished`, `app.realtime.sockets.active`, `app.realtime.leaderboard.broadcasts`, `app.queue.jobs.failed` (by `queue`), `app.queue.submission.persist.duration` (ms). Exported every 30 s. |
| **RUM** | `@openobserve/browser-rum` + `browser-logs` in `src/client/main.ts` | Page loads, resources, long tasks, user interactions and JS errors from the Vue app. Typed input is masked. |

**Redaction.** A Winston format removes cookies (`elsasid`, `adminsid`), `authorization` headers and passwords before logs reach the console or OpenObserve (`src/server/utils/redactor.ts`). It works on a copy, so request data is never modified.

### Enabling it

1. Run OpenObserve, for example locally with Docker, following the OpenObserve docs:

   ```sh
   docker run -d -p 5080:5080 -v $PWD/o2-data:/data -e ZO_DATA_DIR=/data \
     -e ZO_ROOT_USER_EMAIL=root@example.com -e ZO_ROOT_USER_PASSWORD='Complexpass#123' \
     public.ecr.aws/zinclabs/openobserve:latest
   ```

2. Set `OPENOBSERVE_URL=http://localhost:5080`, `OPENOBSERVE_EMAIL` and `OPENOBSERVE_PASSWORD` in `.env`. For the browser, also set the `VITE_OPENOBSERVE_*` variables (client token from OpenObserve → Ingestion → RUM) and rebuild.
3. Build and start with `npm run build && npm start` and `npm run start:worker`. Both start scripts load `dist/server/instrumentation.js` with `node -r` before the app, which auto-instrumentation requires. The API reports as `elsa` and the worker as `elsa-worker`.
4. Both processes log `[openobserve] telemetry enabled …` on startup. Pending telemetry is flushed on SIGTERM/SIGINT.

---

## 5. Token-efficient AI development

This project was built with AI coding assistants. Three tools keep token usage down: a codebase knowledge graph (**graphify**), so the assistant reads less, and two agent skills, **caveman** and **ponytail**, so it writes less.

### Codebase knowledge graph (graphify)

This repository includes a knowledge graph of its own code, built with [graphify](https://pypi.org/project/graphifyy/). It's there to **reduce token usage when working with AI coding assistants**. Without it, an assistant answers questions about the codebase by reading whole files, and most of that text is irrelevant to the question. With the graph, it asks a focused question and gets back only the relevant functions, classes and how they connect.

**Measured on this repo** (`graphify benchmark`, 2026-10-02):

| | Tokens |
|---|---|
| Reading the whole codebase | ~52,900 |
| Average graph query | ~5,800 (**about 9× fewer**) |
| Per question | 5.6× ("what is the main entry point") to 15.4× ("what are the core abstractions") |

#### What's in the repo

| Path | Purpose |
|---|---|
| `graphify-out/graph.json` | The graph: 794 nodes (files, functions, classes, types) and their relationships, extracted from the code's syntax tree |
| `graphify-out/GRAPH_REPORT.md` | Overview: most connected nodes and groups of related code |
| `graphify-out/graph.html` | Interactive visualisation; open it in a browser |
| `CLAUDE.md`, `AGENTS.md` | Tell coding assistants (Claude Code, Codex, etc.) to query the graph before reading source files |

The graph was built **locally from the code only** (`graphify extract . --code-only`). No source code was sent to an LLM to build it. Caches and machine-specific files are git-ignored. Only the shareable graph files above are committed.

#### Using it

```sh
graphify query "how is an answer scored and saved"   # relevant subgraph for a question
graphify path "QuizPlayService" "QuizAnswerRepository"  # how two parts connect
graphify explain "LeaderboardService"                # one concept and its neighbours
graphify god-nodes                                   # the most connected parts of the codebase
```

After changing code, refresh it. This only re-reads the changed files and makes no API calls:

```sh
graphify update .
```

### Agent skills: caveman and ponytail

Both skills are installed in the developer's AI assistant, not in this repository, and they don't affect the application.

| Skill | What it does | Effect on tokens |
|---|---|---|
| **[caveman](https://github.com/JuliusBrussee/caveman)** | Makes the assistant's replies terse. It drops filler, pleasantries and hedging, but keeps code, commands, API names and error messages exactly. | Fewer **output** tokens per reply. The project reports about 65% fewer. |
| **[ponytail](https://github.com/DietrichGebert/ponytail)** | Makes the assistant write the smallest correct change, instead of extra dependencies, wrappers and abstractions, while keeping safety checks. | Less generated code means fewer tokens and smaller diffs to review. The project reports about 54% less code and about 20% lower cost on its benchmarks. |

The figures for caveman and ponytail are each project's own published measurements, not measured on this repository. The graphify figures above were measured here.

---

## 6. Known limitations

- Sessions are **self-paced**: every player answers every question once, in their own time, while the session runs. Scoring is a flat 100 points per correct answer with no speed bonus.
- The leaderboard broadcasts the **top 10**. Players outside it see their own score but not their exact rank. Ties are ordered by Redis, not by who got there first.
- Answers are not rate-limited per player.
- `npm start` and `npm run dev` share `PORT` and cannot run at the same time.
- Telemetry is disabled in development by design. To test it locally, use the production build.
