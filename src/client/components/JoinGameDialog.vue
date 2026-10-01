<script setup lang="ts">
import { ref } from 'vue';
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'radix-vue';
import { Button } from '@client/components/ui/button';
import { cn } from '@client/lib/utils';
import { ApiError, joinGame } from '@client/lib/api';
import { ensureUserSession } from '@client/lib/session';

/** Matches the server's `username: 'required|max:50'` rule. */
const NAME_MAX = 50;

const props = defineProps<{ open: boolean; code: string; sessionName: string | null }>();
const emit = defineEmits<{ joined: [username: string] }>();

const username = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

const errorMessage = (e: unknown) => {
  if (e instanceof ApiError) {
    if (e.status === 409 || e.code === 'duplicate_unique_resource') return 'That name is already taken in this game. Try another one.';
    if (e.status === 422) {
      const messages = (e.data as Record<string, string[] | undefined> | null)?.username;
      return messages?.[0] ?? 'Please check your name.';
    }
    if (e.status === 404 || e.status === 400) return 'This game link is invalid or has expired.';
    if (e.status === 429) return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'Could not join the game. Please try again.';
};

const submit = async () => {
  if (submitting.value) return;
  error.value = null;

  const name = username.value.trim();
  if (!name) {
    error.value = 'Please enter your name to join.';
    return;
  }

  submitting.value = true;
  try {
    // The join endpoint identifies the player by the cookie this sets.
    await ensureUserSession();
    await joinGame(props.code, name);
    emit('joined', name);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <!-- Not dismissable: the player must pick a name before seeing the game. -->
  <DialogRoot :open="props.open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 text-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        @escape-key-down.prevent
        @pointer-down-outside.prevent
        @interact-outside.prevent
      >
        <div class="space-y-1.5">
          <DialogTitle class="text-lg font-semibold leading-none">Join {{ props.sessionName || 'the game' }}</DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground">
            Choose a name. Other players will see it on the leaderboard.
          </DialogDescription>
        </div>

        <form class="grid gap-4" novalidate @submit.prevent="submit">
          <div class="grid gap-2">
            <div class="flex items-baseline justify-between">
              <label for="join-username" class="text-sm font-medium">Your name</label>
              <span class="text-xs text-muted-foreground" aria-hidden="true">{{ username.length }}/{{ NAME_MAX }}</span>
            </div>
            <input
              id="join-username"
              v-model="username"
              type="text"
              autocomplete="nickname"
              :maxlength="NAME_MAX"
              placeholder="e.g. Alice"
              :disabled="submitting"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'join-username-error' : undefined"
              :class="cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive focus-visible:ring-destructive',
              )"
            >
            <p v-if="error" id="join-username-error" role="alert" class="text-sm text-destructive">{{ error }}</p>
          </div>

          <Button type="submit" class="w-full" :loading="submitting">Join game</Button>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
