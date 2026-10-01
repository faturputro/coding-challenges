import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents, LeaderboardEntry, ServerToClientEvents, SessionPlayer, SessionSnapshot, SessionUpdateReason,
} from '@server/types/realtime';
import { ensureUserSession } from './session';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Live view of one session. Registers the anonymous player first (the socket
 * authenticates with that cookie), then subscribes, and re-subscribes after
 * every reconnect because rooms don't survive a dropped connection.
 */
export const useSessionSocket = (code: string, onUpdate?: (reason: SessionUpdateReason, session: SessionSnapshot) => void) => {
  const session = ref<SessionSnapshot | null>(null);
  const player = ref<SessionPlayer>(null);
  const leaderboard = ref<LeaderboardEntry[]>([]);
  const state = ref<ConnectionState>('connecting');
  const error = ref<string | null>(null);
  const socket = shallowRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  let disposed = false;

  const subscribe = async (s: Socket<ServerToClientEvents, ClientToServerEvents>) => {
    try {
      const result = await s.timeout(5000).emitWithAck('session:subscribe', code);
      if (!result.ok) {
        error.value = result.error;
        state.value = 'error';
        return;
      }
      session.value = result.session;
      player.value = result.player;
      leaderboard.value = result.leaderboard;
      error.value = null;
      state.value = 'connected';
    } catch {
      // Ack timed out; the next reconnect will try again.
      state.value = 'reconnecting';
    }
  };

  const start = async () => {
    try {
      await ensureUserSession();
    } catch {
      error.value = 'Could not reach the server. Check your connection and refresh.';
      state.value = 'error';
      return;
    }
    if (disposed) return;

    const s: Socket<ServerToClientEvents, ClientToServerEvents> = io({ withCredentials: true });
    socket.value = s;

    s.on('connect', () => subscribe(s));
    s.on('disconnect', () => {
      if (!disposed) state.value = 'reconnecting';
    });
    s.on('connect_error', (e) => {
      if (e.message === 'unauthorized') {
        error.value = 'Your session could not be verified. Refresh the page to try again.';
        state.value = 'error';
        s.close();
        return;
      }
      state.value = 'reconnecting';
    });
    s.on('session:updated', ({ reason, session: next }) => {
      session.value = next;
      onUpdate?.(reason, next);
    });
    s.on('leaderboard:updated', ({ leaderboard: next }) => {
      leaderboard.value = next;
    });
  };

  start();

  onBeforeUnmount(() => {
    disposed = true;
    socket.value?.close();
  });

  /** Re-reads this player's state (e.g. their id after joining over HTTP) and the leaderboard. */
  const refresh = async () => {
    if (socket.value?.connected) await subscribe(socket.value);
  };

  return { session, player, leaderboard, state, error, refresh };
};
