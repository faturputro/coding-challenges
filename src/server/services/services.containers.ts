import repositoriesContainers from "@server/repositories/repositories.containers";
import QuizSessionService from "./Session.service";
import AdminAuthService from "./AdminAuth.service";
import QuizPlayService from "./QuizPlay.service";
import { enqueueQuizSubmission } from "@server/queues/quizSubmission.queue";
import { RedisSessionEvents } from "@server/realtime/sessionEvents";
import { QueueSessionScheduler } from "@server/queues/sessionLifecycle.queue";
import LeaderboardService from "./Leaderboard.service";

const sessionEvents = new RedisSessionEvents();

export const leaderboardService = new LeaderboardService(
  repositoriesContainers.sessionRepository,
  repositoriesContainers.answerRepository,
  sessionEvents,
);

export const quizSessionService = new QuizSessionService(
  repositoriesContainers.sessionRepository,
  repositoriesContainers.redisRepo,
  sessionEvents,
  new QueueSessionScheduler(),
  leaderboardService,
);

export const adminAuthService = new AdminAuthService(
  repositoriesContainers.adminRepo,
  repositoriesContainers.redisRepo,
)

export const quizPlayService = new QuizPlayService(
  repositoriesContainers.sessionRepository,
  repositoriesContainers.questionRepository,
  repositoriesContainers.answerRepository,
  enqueueQuizSubmission,
  leaderboardService,
);

export default {
  quizSessionService,
  quizPlayService,
  leaderboardService,
  adminAuthService,
};
