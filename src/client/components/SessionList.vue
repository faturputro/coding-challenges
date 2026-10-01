<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Check, Copy, Loader2, Play, RefreshCw } from 'lucide-vue-next';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@client/components/ui/card';
import { cn } from '@client/lib/utils';
import { fetchSessions, SESSION_PAGE_SIZE, startSession, type SessionSummary } from '@client/lib/api';
import { statusBadge } from '@client/lib/sessionStatus';
import { copyText } from '@client/lib/clipboard';

const sessions = ref<SessionSummary[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / SESSION_PAGE_SIZE)));

// Guards against an older, slower response overwriting a newer page.
let latestRequest = 0;

const load = async (target = page.value) => {
  const requestId = ++latestRequest;
  loading.value = true;
  error.value = null;

  try {
    const result = await fetchSessions(target);
    if (requestId !== latestRequest) return;
    sessions.value = result.data;
    total.value = result.total;
    page.value = target;
  } catch (e) {
    if (requestId !== latestRequest) return;
    error.value = e instanceof Error ? e.message : 'Could not load sessions';
  } finally {
    if (requestId === latestRequest) loading.value = false;
  }
};

const copiedCode = ref<string | null>(null);
const copyFailedCode = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

/** Link players open to join; the code alone is still shown for reading aloud. */
const joinLink = (code: string) => `${window.location.origin}/play/${encodeURIComponent(code)}`;

const copyJoinLink = async (code: string) => {
  clearTimeout(copyTimer);
  try {
    await copyText(joinLink(code));
    copiedCode.value = code;
    copyFailedCode.value = null;
  } catch {
    copiedCode.value = null;
    copyFailedCode.value = code;
  }
  copyTimer = setTimeout(() => {
    copiedCode.value = null;
    copyFailedCode.value = null;
  }, 2000);
};

const startingCode = ref<string | null>(null);
const startError = ref<{ code: string; message: string } | null>(null);

// Starting notifies every player on /play/:code over the socket; the list just refreshes.
const start = async (session: SessionSummary) => {
  if (startingCode.value) return;
  startingCode.value = session.code;
  startError.value = null;
  try {
    await startSession(session.code);
    await load();
  } catch (e) {
    startError.value = { code: session.code, message: e instanceof Error ? e.message : 'Could not start the game' };
  } finally {
    startingCode.value = null;
  }
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

onMounted(() => load(1));
onBeforeUnmount(() => clearTimeout(copyTimer));

defineExpose({ reload: () => load(1) });
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-start justify-between gap-4">
      <div class="space-y-1.5">
        <CardTitle class="text-xl">Sessions</CardTitle>
        <CardDescription>Share a code so players can join.</CardDescription>
      </div>
      <Button variant="outline" size="icon" aria-label="Refresh sessions" :disabled="loading" @click="load()">
        <RefreshCw :class="cn('h-4 w-4', loading && 'animate-spin')" />
      </Button>
    </CardHeader>

    <CardContent>
      <div v-if="error" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/50 p-4 text-sm">
        <span class="text-destructive">{{ error }}</span>
        <Button variant="outline" size="sm" @click="load()">Try again</Button>
      </div>

      <ul v-else-if="loading && !sessions.length" aria-busy="true" aria-label="Loading sessions" class="divide-y">
        <li v-for="n in 3" :key="n" class="flex items-center justify-between gap-4 py-4">
          <div class="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div class="h-8 w-28 animate-pulse rounded bg-muted" />
        </li>
      </ul>

      <p v-else-if="!sessions.length" class="py-8 text-center text-sm text-muted-foreground">
        No sessions yet. Create one to get started.
      </p>

      <ul v-else :aria-busy="loading" :class="cn('divide-y transition-opacity', loading && 'opacity-60')">
        <li v-for="session in sessions" :key="session.code" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span :class="cn('truncate font-medium', !session.name && 'italic text-muted-foreground')">
                {{ session.name || 'Untitled session' }}
              </span>
              <span :class="cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadge(session.status).class)">
                {{ statusBadge(session.status).label }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{{ formatDate(session.created_at) }}</p>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 rounded-md border bg-muted/40 pl-3">
              <code class="font-mono text-sm tracking-wider">{{ session.code }}</code>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                :aria-label="copiedCode === session.code ? `Copied join link for ${session.code}` : `Copy join link for ${session.code}`"
                title="Copy join link"
                @click="copyJoinLink(session.code)"
              >
                <Check v-if="copiedCode === session.code" class="h-4 w-4 text-primary" />
                <Copy v-else class="h-4 w-4" />
              </Button>
            </div>
            <Button
              v-if="session.status === 'not_started'"
              size="icon"
              class="h-9 w-9 shrink-0 rounded-full"
              :aria-label="`Start ${session.name || 'untitled session'}`"
              title="Start game"
              :disabled="!!startingCode"
              @click="start(session)"
            >
              <Loader2 v-if="startingCode === session.code" class="h-4 w-4 animate-spin" />
              <Play v-else class="ml-0.5 h-4 w-4 fill-current" />
            </Button>
          </div>
          <span class="sr-only" aria-live="polite">
            {{ copiedCode === session.code ? 'Join link copied' : copyFailedCode === session.code ? 'Copy failed' : '' }}
          </span>
          <p v-if="startError?.code === session.code" role="alert" class="w-full text-right text-xs text-destructive">
            {{ startError.message }}
          </p>
          <p v-if="copyFailedCode === session.code" class="w-full text-right text-xs text-destructive">
            Couldn't copy. Share this link: {{ joinLink(session.code) }}
          </p>
        </li>
      </ul>
    </CardContent>

    <CardFooter v-if="!error && total > SESSION_PAGE_SIZE" class="flex items-center justify-between gap-4">
      <span class="text-sm text-muted-foreground">Page {{ page }} of {{ totalPages }} · {{ total }} sessions</span>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="loading || page <= 1" @click="load(page - 1)">Previous</Button>
        <Button variant="outline" size="sm" :disabled="loading || page >= totalPages" @click="load(page + 1)">Next</Button>
      </div>
    </CardFooter>
  </Card>
</template>
