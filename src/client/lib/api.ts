import type { AnswerResult, PlayerQuestions } from '@server/types/quiz';

export type SessionStatus = 'not_started' | 'in_progress' | 'finished';

export interface SessionSummary {
  code: string;
  name: string | null;
  status: SessionStatus;
  created_at: string;
}

export interface SessionPage {
  total: number;
  data: SessionSummary[];
}

/** Matches the page size used by the server's session list. */
export const SESSION_PAGE_SIZE = 10;

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  code?: string;
  data: T;
}

/** Carries the HTTP status, the server's error `code` and its `data` (e.g. field errors on 422). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly data: unknown, readonly code: string | null = null) {
    super(message);
    this.name = 'ApiError';
  }
}

let unauthorizedHandler: (() => void) | undefined;

/** Called when a request is rejected with 401, e.g. to send the user to the login page. */
export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

const request = async <T>(url: string, init: RequestInit = {}, { notifyUnauthorized = true } = {}): Promise<T> => {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (res.status === 401 && notifyUnauthorized) unauthorizedHandler?.();

  if (!res.ok || !body?.success) {
    throw new ApiError(body?.message ?? `Request failed with status ${res.status}`, res.status, body?.data ?? null, body?.code ?? null);
  }

  return body.data;
};

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** `page` is 1-based, as the server expects. */
export const fetchSessions = (page = 1) =>
  request<SessionPage>(`/api/v1/session?${new URLSearchParams({ page: String(page) })}`);

export const createSession = (name: string) =>
  request<Pick<SessionSummary, 'code' | 'name' | 'status'>>('/api/v1/session', postJson({ name }));

export interface AdminProfile {
  id: number;
  email: string;
}

// Auth calls handle 401 themselves (wrong password, or simply not logged in yet).
export const login = (email: string, password: string) =>
  request<null>('/api/v1/auth/login', postJson({ email, password }), { notifyUnauthorized: false });

export const fetchProfile = () =>
  request<AdminProfile>('/api/v1/auth/profile', {}, { notifyUnauthorized: false });

/** Admin: start a session; every subscribed player is notified over the socket. */
export const startSession = (code: string) =>
  request<null>(`/api/v1/session/${encodeURIComponent(code)}/start`, { method: 'PUT' });

/** Player: join a session under a display name. Players aren't admins, so 401 must not redirect to login. */
export const joinGame = (code: string, username: string) =>
  request<null>(`/api/v1/play/${encodeURIComponent(code)}/join`, postJson({ username }), { notifyUnauthorized: false });

/** Player: the session's questions (without answers), plus what this player already answered. */
export const fetchQuestions = (code: string) =>
  request<PlayerQuestions>(`/api/v1/play/${encodeURIComponent(code)}/questions`, {}, { notifyUnauthorized: false });

/** Player: answer one question; scored on the server. */
export const submitAnswer = (code: string, questionId: number, answer: string) =>
  request<AnswerResult>(
    `/api/v1/play/${encodeURIComponent(code)}/questions/${questionId}/answer`,
    postJson({ answer }),
    { notifyUnauthorized: false },
  );
