# Graph Report - .  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 794 nodes · 1403 edges · 82 communities (37 shown, 45 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `563d0f1b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78

## God Nodes (most connected - your core abstractions)
1. `QuizSession` - 26 edges
2. `compilerOptions` - 23 edges
3. `scripts` - 18 edges
4. `Admin` - 18 edges
5. `Connection` - 16 edges
6. `QuizParticipant` - 16 edges
7. `ISessionService` - 16 edges
8. `ISessionRepository` - 16 edges
9. `logger` - 16 edges
10. `cn()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `persistQuizSubmission()` --references--> `sequelize`  [EXTRACTED]
  src/server/workers/quizSubmission.worker.ts → package.json
- `createSocketServer()` --references--> `@server/*`  [EXTRACTED]
  src/server/realtime/socket.ts → tsconfig.json
- `up()` --references--> `sequelize`  [EXTRACTED]
  migrations/20260930150943-create-quiz_session.js → package.json
- `submit()` --calls--> `joinGame()`  [EXTRACTED]
  src/client/components/JoinGameDialog.vue → src/client/lib/api.ts
- `submit()` --calls--> `createSession()`  [EXTRACTED]
  src/client/components/NewGameDialog.vue → src/client/lib/api.ts

## Import Cycles
- None detected.

## Communities (82 total, 45 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): ConnectionState, GameStatus, ISessionScheduler, ISessionEvents, RedisSessionEvents, createSocketServer(), QuizSocketServer, readCookie() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (22): QuizSubmissionJob, answersKey(), leaderboardKey(), playersKey(), QuizAnswerRepository, RedisWithQuizScripts, QuizQuestionRepository, QuizPlayService (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (41): autoprefixer, concurrently, nodemon, devDependencies, autoprefixer, concurrently, nodemon, postcss (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): config, config/vite.config.ts, dist, DOM, DOM.Iterable, ES2020, migrations, node_modules (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (14): Admin, AllowNull, AutoIncrement, Column, CreatedAt, Default, DeletedAt, PrimaryKey (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (30): QuizQuestion, AllowNull, AutoIncrement, Column, CreatedAt, Default, DeletedAt, PrimaryKey (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (23): QuizParticipant, AllowNull, AutoIncrement, Column, CreatedAt, Default, DeletedAt, PrimaryKey (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (12): Put, PlayerSessionControllerV1, Controller, Get, Middleware, Post, QuizSessionControllerV1, Controller (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (27): allAnswered, answer(), answeredCount, answers, CHOICE_CLASS, chosen, current, done (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (27): author, description, engines, node, keywords, license, name, private (+19 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (10): acquireConnections(), connectRedis(), Connection, limiterMap, closeSessionLifecycleQueue(), FinishSessionJob, getQueue(), QueueSessionScheduler (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (17): AdminProfile, ApiEnvelope, createSession(), fetchProfile(), fetchSessions(), joinGame(), login(), onUnauthorized() (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (10): meListed, props, RANK_CLASS, props, props, props, props, props (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (16): copiedCode, copyFailedCode, copyJoinLink(), error, joinLink(), load(), loading, page (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (8): AuthControllerV1, Controller, err, redis, AdminJWTClaim, logger, redactSecrets, redactor

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): errorHandler(), AppErrorCode, AppError, AppErrorOptions, decryptor(), JWTClaim

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (11): darkMode, emit, error, errorMessage(), props, submit(), submitting, username (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (12): SessionStatus, SESSION_STATUS, statusBadge(), announcement, ANNOUNCEMENTS, code, finalScore, needsName (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (6): LeaderboardService, rankScores(), assert, { default: LeaderboardService, rankScores }, SESSION, { test }

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (13): bullmq, class-variance-authority, @opentelemetry/api-logs, @opentelemetry/resources, @opentelemetry/sdk-logs, @opentelemetry/sdk-metrics, dependencies, bullmq (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (8): DB_CONFIG, QUEUE_CONFIG, REDIS_CONFIG, SOCKET_ALLOWED_ORIGINS, assertValidSubmission(), createQuizSubmissionWorker(), isPositiveInt(), persistQuizSubmission()

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (6): Get, Middleware, Post, AdminAuthService, IAdminAuthService, encryptor()

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (10): emit, fieldError, firstFieldError(), formError, name, open, submit(), submitting (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (9): closeQuizSubmissionQueue(), enqueueQuizSubmission(), getQuizSubmissionQueue(), submissionJobId(), adminAuthService, leaderboardService, quizPlayService, quizSessionService (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (8): assert, BOARD, { createSocketServer }, http, { io: connect }, { sessionRoom }, sessions, { test }

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (10): email, error, errorMessage(), password, route, router, showPassword, submit() (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (9): __als, ContextOptions, data(), getStore(), id(), request(), setUser(), timestamp() (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.32
Nodes (6): logger, OpenTelemetryTransport, severityByLevel, toAttributes(), toAttributeValue(), WinstonLogInfo

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (4): assert, CODES, QUESTION, { test }

### Community 29 - "Community 29"
Cohesion: 0.38
Nodes (4): Props, ButtonVariants, currentAdmin, sessionList

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (4): dotenv, up(), sequelize, sequelize

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (3): annotateServerSpan(), ExpressRequest, getRoutePattern()

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (3): Express, Request, Response

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (3): ChildControllers, ControllerV1, Controller

## Knowledge Gaps
- **240 isolated node(s):** `port`, `config`, `dotenv`, `name`, `version` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 19` to `Community 9`, `Community 30`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`?**
  _High betweenness centrality (0.333) - this node is a cross-community bridge._
- **Why does `sequelize` connect `Community 30` to `Community 19`, `Community 20`?**
  _High betweenness centrality (0.312) - this node is a cross-community bridge._
- **Why does `persistQuizSubmission()` connect `Community 20` to `Community 30`?**
  _High betweenness centrality (0.310) - this node is a cross-community bridge._
- **What connects `port`, `config`, `dotenv` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07161125319693094 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08784313725490196 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._