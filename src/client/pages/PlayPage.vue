<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Loader2, Users } from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import JoinGameDialog from '@client/components/JoinGameDialog.vue';
import QuizRunner from '@client/components/QuizRunner.vue';
import Leaderboard from '@client/components/Leaderboard.vue';
import { cn } from '@client/lib/utils';
import { statusBadge } from '@client/lib/sessionStatus';
import { useSessionSocket } from '@client/lib/useSessionSocket';
import type { SessionUpdateReason } from '@server/types/realtime';

const route = useRoute();
const code = String(route.params.code);

const announcement = ref('');
const ANNOUNCEMENTS: Partial<Record<SessionUpdateReason, string>> = {
  started: 'The quiz has started!',
  finished: 'The quiz has ended.',
};

const { session, player, leaderboard, state, error, refresh } = useSessionSocket(code, (reason) => {
  if (ANNOUNCEMENTS[reason]) announcement.value = ANNOUNCEMENTS[reason]!;
});

// Last score seen while playing, shown once the quiz ends.
const finalScore = ref<number | null>(null);

const playing = computed(() => session.value?.status === 'in_progress' && !!player.value);

// Ask for a name once the session is known, unless already joined or the game is over.
const needsName = computed(() => state.value === 'connected' && !!session.value && !player.value && session.value.status !== 'finished');

const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null;

const STATUS_MESSAGE = {
  not_started: 'Waiting for the host to start the quiz…',
  in_progress: 'The quiz has started. Good luck!',
  finished: 'This quiz has ended. Thanks for playing!',
} as const;
</script>

<template>
  <div class="space-y-6">
    <p class="sr-only" aria-live="assertive">{{ announcement }}</p>

    <Card v-if="error" role="alert">
      <CardHeader>
        <CardTitle class="text-xl">Can't open this game</CardTitle>
        <CardDescription>{{ error }}</CardDescription>
      </CardHeader>
    </Card>

    <Card v-else-if="!session" aria-busy="true">
      <CardContent class="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
        Connecting to the game…
      </CardContent>
    </Card>

    <template v-else>
      <Card>
        <CardHeader class="gap-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <CardTitle class="text-2xl">{{ session.name || 'Quiz game' }}</CardTitle>
            <span :class="cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadge(session.status).class)">
              {{ statusBadge(session.status).label }}
            </span>
          </div>
          <CardDescription>
            Code <code class="font-mono tracking-wider text-foreground">{{ session.code }}</code>
            <template v-if="player"> · Playing as <span class="font-medium text-foreground">{{ player.username }}</span></template>
          </CardDescription>
        </CardHeader>

        <CardContent class="grid gap-4">
          <div class="flex items-center gap-4 rounded-lg border p-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users class="h-6 w-6" />
            </div>
            <div>
              <p class="text-3xl font-semibold tabular-nums" aria-live="polite" aria-atomic="true">
                {{ session.total_players }}
                <span class="sr-only">{{ session.total_players === 1 ? 'player has' : 'players have' }} joined</span>
              </p>
              <p class="text-sm text-muted-foreground" aria-hidden="true">
                {{ session.total_players === 1 ? 'player joined' : 'players joined' }}
              </p>
            </div>
          </div>

          <div :class="cn('rounded-lg p-4 text-sm', session.status === 'in_progress' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')">
            <p class="font-medium">{{ STATUS_MESSAGE[session.status] }}</p>
            <p v-if="session.status === 'in_progress' && session.finished_at" class="mt-1 opacity-90">
              Ends at {{ formatTime(session.finished_at) }}
            </p>
            <p v-if="session.status === 'finished' && finalScore !== null" class="mt-1">
              Your final score: <span class="font-semibold tabular-nums text-foreground">{{ finalScore }}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <QuizRunner v-if="playing" :code="code" @score="(total) => (finalScore = total)" />

      <Leaderboard :entries="leaderboard" :me-id="player?.id ?? null" :my-score="finalScore" />

      <p class="flex items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
        <span :class="cn('h-2 w-2 rounded-full', state === 'connected' ? 'bg-green-500' : 'animate-pulse bg-amber-500')" aria-hidden="true" />
        {{ state === 'connected' ? 'Live' : 'Reconnecting…' }}
      </p>
    </template>

    <JoinGameDialog
      v-if="session"
      :open="needsName"
      :code="code"
      :session-name="session.name"
      @joined="refresh"
    />
  </div>
</template>
