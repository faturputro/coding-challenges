<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger,
} from 'radix-vue';
import { X } from 'lucide-vue-next';
import { Button } from '@client/components/ui/button';
import { cn } from '@client/lib/utils';
import { ApiError, createSession } from '@client/lib/api';

/** Matches the server's `name: 'max:50'` rule. */
const NAME_MAX = 50;

const emit = defineEmits<{ created: [session: { code: string; name: string | null }] }>();

const open = ref(false);
const name = ref('');
const submitting = ref(false);
const fieldError = ref<string | null>(null);
const formError = ref<string | null>(null);

const trimmed = computed(() => name.value.trim());

// Start each opening with a clean form.
watch(open, (isOpen) => {
  if (!isOpen) return;
  name.value = '';
  fieldError.value = null;
  formError.value = null;
});

const firstFieldError = (data: unknown): string | null => {
  const messages = (data as Record<string, string[] | undefined> | null)?.name;
  return Array.isArray(messages) && messages.length ? messages[0] : null;
};

const submit = async () => {
  if (submitting.value) return;
  fieldError.value = null;
  formError.value = null;

  if (!trimmed.value) {
    fieldError.value = 'Please enter a name for the game.';
    return;
  }

  submitting.value = true;
  try {
    const session = await createSession(trimmed.value);
    emit('created', session);
    open.value = false;
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      fieldError.value = firstFieldError(e.data) ?? e.message;
    } else {
      formError.value = e instanceof Error ? e.message : 'Could not create the game. Please try again.';
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child>
      <slot name="trigger" />
    </DialogTrigger>

    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 text-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        @interact-outside="(e) => submitting && e.preventDefault()"
        @escape-key-down="(e) => submitting && e.preventDefault()"
      >
        <div class="space-y-1.5 pr-6">
          <DialogTitle class="text-lg font-semibold leading-none">New game</DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground">
            Give your game a name. Players will see it when they join.
          </DialogDescription>
        </div>

        <form class="grid gap-4" novalidate @submit.prevent="submit">
          <div class="grid gap-2">
            <div class="flex items-baseline justify-between">
              <label for="new-game-name" class="text-sm font-medium">Name</label>
              <span :class="cn('text-xs text-muted-foreground', name.length > NAME_MAX && 'text-destructive')" aria-hidden="true">
                {{ name.length }}/{{ NAME_MAX }}
              </span>
            </div>
            <input
              id="new-game-name"
              v-model="name"
              type="text"
              autocomplete="off"
              :maxlength="NAME_MAX"
              placeholder="e.g. Morning vocab sprint"
              :disabled="submitting"
              :aria-invalid="!!fieldError"
              :aria-describedby="fieldError ? 'new-game-name-error' : undefined"
              :class="cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                fieldError && 'border-destructive focus-visible:ring-destructive',
              )"
            >
            <p v-if="fieldError" id="new-game-name-error" role="alert" class="text-sm text-destructive">{{ fieldError }}</p>
          </div>

          <p v-if="formError" role="alert" class="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
            {{ formError }}
          </p>

          <div class="flex justify-end gap-2">
            <DialogClose as-child>
              <Button variant="outline" :disabled="submitting">Cancel</Button>
            </DialogClose>
            <Button type="submit" :loading="submitting">Create game</Button>
          </div>
        </form>

        <DialogClose
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close"
          :disabled="submitting"
        >
          <X class="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
