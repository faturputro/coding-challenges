let ready: Promise<void> | undefined;

/**
 * Registers an anonymous user ID with the server. The server stores it in an
 * HttpOnly cookie, so the client never reads it; it only needs the call to
 * have finished. Calls share one request, and a failed attempt is retried on
 * the next call. Await this before any API call that needs the user.
 */
export const ensureUserSession = (): Promise<void> => {
  ready ??= fetch('/api/v1/session/init', { credentials: 'same-origin' })
    .then((res) => {
      if (!res.ok) throw new Error(`Session init failed with status ${res.status}`);
    })
    .catch((error) => {
      ready = undefined;
      throw error;
    });

  return ready;
};
