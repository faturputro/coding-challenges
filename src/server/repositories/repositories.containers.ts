import AdminRepository from "./Admin.repository";
import QuizSessionRepository from "./QuizSession.repository";
import RedisRepo from "./Redis.repository";
import QuizQuestionRepository from "./QuizQuestion.repository";
import QuizAnswerRepository from "./QuizAnswer.repository";

export default {
  redisRepo: new RedisRepo(),
  adminRepo: new AdminRepository(),
  sessionRepository: new QuizSessionRepository(),
  questionRepository: new QuizQuestionRepository(),
  answerRepository: new QuizAnswerRepository(),
};
