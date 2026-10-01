export {};

declare global {
  namespace Express {
    export interface Request {
      user: UserSession;
      request_id: string;
      timestamp: string;
    }

    interface Response {
      success(data?: unknown, message?: string): Response;
      failed(error: unknown): Response;
    }
  }
}
