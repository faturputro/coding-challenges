import type Redis from "ioredis";
import Connection from "@server/config/connection";
import type { IQuizAnswerRepository, LeaderboardScore, RecordAnswerDto, RecordAnswerResult } from "@server/types/quiz";

/**
 * Dedupe and scoring in one atomic step, so two concurrent submissions of the
 * same question can't both score.
 * KEYS[1] answers hash (questionId -> choice), KEYS[2] leaderboard zset, KEYS[3] players hash (id -> username)
 * ARGV: questionId, answer, points, participantId, expireAt (unix seconds), username
 * Returns { recorded (1|0), answer kept, total score }.
 */
const RECORD_ANSWER_LUA = `
if redis.call('HSETNX', KEYS[1], ARGV[1], ARGV[2]) == 0 then
  return { 0, redis.call('HGET', KEYS[1], ARGV[1]), redis.call('ZSCORE', KEYS[2], ARGV[4]) or '0' }
end
local total = redis.call('ZINCRBY', KEYS[2], ARGV[3], ARGV[4])
redis.call('HSET', KEYS[3], ARGV[4], ARGV[6])
redis.call('EXPIREAT', KEYS[1], ARGV[5])
redis.call('EXPIREAT', KEYS[2], ARGV[5])
redis.call('EXPIREAT', KEYS[3], ARGV[5])
return { 1, ARGV[2], total }
`;

/**
 * Lists a player at 0 points without touching an existing score.
 * KEYS[1] leaderboard zset, KEYS[2] players hash; ARGV: participantId, username, ttl seconds
 * Only sets a TTL when a key has none, so it never overrides the expiry that
 * answering anchors to the session's end (EXPIRE NX without needing Redis 7).
 */
const ADD_PLAYER_LUA = `
redis.call('ZADD', KEYS[1], 'NX', 0, ARGV[1])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
for _, key in ipairs(KEYS) do
  if redis.call('TTL', key) == -1 then redis.call('EXPIRE', key, ARGV[3]) end
end
return 1
`;

/** Players who joined but never answered are dropped after this long. */
const JOINED_PLAYER_TTL_SECONDS = 7 * 24 * 3600;

type RedisWithQuizScripts = Redis & {
  recordQuizAnswer(
    answersKey: string, leaderboardKey: string, playersKey: string, ...args: (string | number)[]
  ): Promise<[number, string, string]>;
  addQuizPlayer(leaderboardKey: string, playersKey: string, ...args: (string | number)[]): Promise<number>;
};

// The {sessionId} hash tag keeps a session's keys in one Redis Cluster slot, as the script requires.
export const answersKey = (sessionId: number, participantId: number) => `quiz:{${sessionId}}:answers:${participantId}`;
export const leaderboardKey = (sessionId: number) => `quiz:{${sessionId}}:leaderboard`;
export const playersKey = (sessionId: number) => `quiz:{${sessionId}}:players`;

export default class QuizAnswerRepository implements IQuizAnswerRepository {
  constructor(private readonly redis: Redis = Connection.Redis()) {
    if (!('recordQuizAnswer' in this.redis)) {
      this.redis.defineCommand('recordQuizAnswer', { numberOfKeys: 3, lua: RECORD_ANSWER_LUA });
      this.redis.defineCommand('addQuizPlayer', { numberOfKeys: 2, lua: ADD_PLAYER_LUA });
    }
  }

  async recordAnswer(dto: RecordAnswerDto): Promise<RecordAnswerResult> {
    const [recorded, answer, total] = await (this.redis as RedisWithQuizScripts).recordQuizAnswer(
      answersKey(dto.sessionId, dto.participantId),
      leaderboardKey(dto.sessionId),
      playersKey(dto.sessionId),
      dto.questionId,
      dto.answer,
      dto.points,
      dto.participantId,
      Math.ceil(dto.expireAt.getTime() / 1000),
      dto.username,
    );

    const totalScore = Number(total);
    return recorded === 1
      ? { recorded: true, totalScore }
      : { recorded: false, previousAnswer: answer, totalScore };
  }

  async getAnswers(sessionId: number, participantId: number) {
    return this.redis.hgetall(answersKey(sessionId, participantId));
  }

  async getScore(sessionId: number, participantId: number) {
    return Number(await this.redis.zscore(leaderboardKey(sessionId), String(participantId)) ?? 0);
  }

  async addPlayer(sessionId: number, participantId: number, username: string) {
    await (this.redis as RedisWithQuizScripts).addQuizPlayer(
      leaderboardKey(sessionId),
      playersKey(sessionId),
      participantId,
      username,
      JOINED_PLAYER_TTL_SECONDS,
    );
  }

  async getTopScores(sessionId: number, limit: number): Promise<LeaderboardScore[]> {
    const flat = await this.redis.zrevrange(leaderboardKey(sessionId), 0, limit - 1, 'WITHSCORES');
    const ids: string[] = [];
    for (let i = 0; i < flat.length; i += 2) ids.push(flat[i]);
    if (!ids.length) return [];

    const names = await this.redis.hmget(playersKey(sessionId), ...ids);
    return ids.map((id, i) => ({
      player_id: Number(id),
      username: names[i] ?? 'Player',
      score: Number(flat[i * 2 + 1]),
    }));
  }
}
