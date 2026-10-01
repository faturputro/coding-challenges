<script setup lang="ts">
import { computed } from 'vue';
import { Trophy } from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { cn } from '@client/lib/utils';
import type { LeaderboardEntry } from '@server/types/realtime';

const props = defineProps<{
  entries: LeaderboardEntry[];
  /** The viewer's player id, to highlight their row. */
  meId: number | null;
  /** The viewer's own score, shown below when they're outside the top entries. */
  myScore: number | null;
}>();

const meListed = computed(() => props.entries.some((e) => e.player_id === props.meId));

const RANK_CLASS: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-orange-300 text-orange-950',
};
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center gap-2 pb-3">
      <Trophy class="h-5 w-5 text-primary" aria-hidden="true" />
      <CardTitle class="text-lg">Leaderboard</CardTitle>
    </CardHeader>
    <CardContent>
      <p v-if="!entries.length" class="py-4 text-center text-sm text-muted-foreground">
        No players yet. Share the code to get people in!
      </p>

      <ol v-else class="relative grid gap-1" aria-label="Leaderboard">
        <TransitionGroup name="leaderboard">
          <li
            v-for="entry in entries"
            :key="entry.player_id"
            :aria-current="entry.player_id === meId ? 'true' : undefined"
            :class="cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
              entry.player_id === meId ? 'bg-primary/10 ring-1 ring-primary/40' : 'odd:bg-muted/40',
            )"
          >
            <span
              :class="cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums', RANK_CLASS[entry.rank] ?? 'bg-muted text-muted-foreground')"
              :aria-label="`Rank ${entry.rank}`"
            >
              {{ entry.rank }}
            </span>
            <span class="min-w-0 flex-1 truncate font-medium">
              {{ entry.username }}
              <span v-if="entry.player_id === meId" class="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
            </span>
            <span class="font-semibold tabular-nums">{{ entry.score }}</span>
          </li>
        </TransitionGroup>
      </ol>

      <div
        v-if="entries.length && meId !== null && !meListed && myScore !== null"
        class="mt-2 flex items-center gap-3 border-t px-3 pt-3 text-sm"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground" aria-hidden="true">…</span>
        <span class="flex-1 font-medium">You</span>
        <span class="font-semibold tabular-nums">{{ myScore }}</span>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.leaderboard-move,
.leaderboard-enter-active,
.leaderboard-leave-active {
  transition: transform 0.35s ease, opacity 0.35s ease;
}
.leaderboard-enter-from,
.leaderboard-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
/* Take leaving rows out of the flow so the others can animate into place. */
.leaderboard-leave-active {
  position: absolute;
  inset-inline: 0;
}
@media (prefers-reduced-motion: reduce) {
  .leaderboard-move,
  .leaderboard-enter-active,
  .leaderboard-leave-active {
    transition: none;
  }
}
</style>
