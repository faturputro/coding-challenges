import QuizQuestion from "@server/models/sql/QuizQuestion";
import type { IQuizQuestionRepository, QuizQuestionRecord } from "@server/types/quiz";

/** Questions change rarely, so each process keeps them briefly instead of querying per answer. */
const CACHE_TTL_MS = 60_000;

export default class QuizQuestionRepository implements IQuizQuestionRepository {
  private cache: { at: number; byId: Map<number, QuizQuestionRecord>; list: QuizQuestionRecord[] } | null = null;

  private async load() {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache;

    const rows = await QuizQuestion.findAll({
      attributes: ['id', 'question', 'choices'],
      order: [['id', 'ASC']],
    });
    const list = rows.map((row) => ({
      id: row.id,
      question: row.question,
      choices: Array.isArray(row.choices) ? row.choices : [],
    }));

    this.cache = { at: Date.now(), list, byId: new Map(list.map((q) => [q.id, q])) };
    return this.cache;
  }

  async listQuestions() {
    return (await this.load()).list;
  }

  async getQuestion(id: number) {
    return (await this.load()).byId.get(id) ?? null;
  }
}
