<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { Check, Loader2, Trophy, X } from 'lucide-vue-next';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader } from '@client/components/ui/card';
import { ApiError, fetchQuestions, submitAnswer } from '@client/lib/api';
import { cn } from '@client/lib/utils';
import type { AnswerResult, PublicQuizQuestion } from '@server/types/quiz';

const props = defineProps<{ code: string }>();
const emit = defineEmits<{ score: [total: number] }>();

const questions = ref<PublicQuizQuestion[]>([]);
/** Submitted choice per question id. */
const answers = ref<Record<string, string>>({});
const totalScore = ref(0);
/** Index of the question on screen. */
const index = ref(0);
/** Result for the question on screen, once answered in this visit. */
const feedback = ref<AnswerResult | null>(null);

const loading = ref(true);
const submitting = ref<string | null>(null);
const loadError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const nextButton = ref<InstanceType<typeof Button> | null>(null);

const total = computed(() => questions.value.length);
const answeredCount = computed(() => questions.value.filter((q) => answers.value[q.id]).length);
const done = computed(() => total.value > 0 && index.value >= total.value);
const current = computed(() => questions.value[index.value] ?? null);
const chosen = computed(() => (current.value ? answers.value[current.value.id] ?? null : null));
const allAnswered = computed(() => answeredCount.value === total.value);

const setScore = (value: number) => {
  totalScore.value = value;
  emit('score', value);
};

/** Resume at the first question this player hasn't answered yet (e.g. after a refresh). */
const firstUnanswered = () => {
  const i = questions.value.findIndex((q) => !answers.value[q.id]);
  return i === -1 ? questions.value.length : i;
};

const load = async () => {
  loading.value = true;
  loadError.value = null;
  try {
    const data = await fetchQuestions(props.code);
    questions.value = data.questions;
    answers.value = data.answers;
    setScore(data.total_score);
    index.value = firstUnanswered();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Could not load the questions';
  } finally {
    loading.value = false;
  }
};

const answer = async (choiceId: string) => {
  const question = current.value;
  if (!question || chosen.value || submitting.value) return;

  submitting.value = choiceId;
  submitError.value = null;
  try {
    const result = await submitAnswer(props.code, question.id, choiceId);
    answers.value = { ...answers.value, [question.id]: choiceId };
    feedback.value = result;
    setScore(result.total_score);
    await nextTick();
    // Keyboard and screen reader users land on the way forward.
    (nextButton.value?.$el as HTMLElement | undefined)?.focus();
  } catch (e) {
    const data = e instanceof ApiError ? (e.data as { answer?: string; total_score?: number } | null) : null;
    if (e instanceof ApiError && e.status === 409 && data?.answer) {
      // Answered already (e.g. in another tab): keep the recorded answer and move on.
      answers.value = { ...answers.value, [question.id]: data.answer };
      if (typeof data.total_score === 'number') setScore(data.total_score);
      next();
    } else {
      submitError.value = e instanceof Error ? e.message : 'Could not submit your answer. Please try again.';
    }
  } finally {
    submitting.value = null;
  }
};

const next = () => {
  feedback.value = null;
  submitError.value = null;
  index.value = firstUnanswered();
};

const choiceState = (choiceId: string) => {
  if (!feedback.value) return 'idle';
  if (choiceId === feedback.value.correct_answer) return 'correct';
  if (choiceId === chosen.value) return 'wrong';
  return 'dimmed';
};

const CHOICE_CLASS = {
  idle: 'border-input hover:border-primary hover:bg-accent',
  correct: 'border-green-600 bg-green-600/10 text-foreground',
  wrong: 'border-destructive bg-destructive/10 text-foreground',
  dimmed: 'border-input opacity-50',
} as const;

onMounted(load);
</script>

<template>
  <Card>
    <CardContent v-if="loading" class="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground" aria-busy="true">
      <Loader2 class="h-4 w-4 animate-spin" />
      Loading questions…
    </CardContent>

    <CardContent v-else-if="loadError" class="flex flex-wrap items-center justify-between gap-3 p-6 text-sm" role="alert">
      <span class="text-destructive">{{ loadError }}</span>
      <Button variant="outline" size="sm" @click="load">Try again</Button>
    </CardContent>

    <CardContent v-else-if="!total" class="p-6 text-center text-sm text-muted-foreground">
      This quiz has no questions yet.
    </CardContent>

    <template v-else-if="done">
      <CardContent class="grid justify-items-center gap-3 p-8 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy class="h-7 w-7" />
        </div>
        <p class="text-lg font-semibold">You've answered all {{ total }} questions!</p>
        <p class="text-sm text-muted-foreground">
          Your score: <span class="text-2xl font-semibold tabular-nums text-foreground">{{ totalScore }}</span>
        </p>
      </CardContent>
    </template>

    <template v-else-if="current">
      <CardHeader class="gap-3">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium">Question {{ index + 1 }} of {{ total }}</span>
          <span class="text-muted-foreground">Score <span class="font-semibold tabular-nums text-foreground">{{ totalScore }}</span></span>
        </div>
        <div
          class="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          :aria-valuenow="answeredCount"
          aria-valuemin="0"
          :aria-valuemax="total"
          :aria-label="`${answeredCount} of ${total} questions answered`"
        >
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${(answeredCount / total) * 100}%` }" />
        </div>
      </CardHeader>

      <CardContent class="grid gap-4">
        <h2 :id="`question-${current.id}`" class="text-lg font-semibold leading-snug">{{ current.question }}</h2>

        <div role="group" :aria-labelledby="`question-${current.id}`" class="grid gap-2">
          <button
            v-for="choice in current.choices"
            :key="choice.id"
            type="button"
            :disabled="!!chosen || !!submitting"
            :aria-pressed="chosen === choice.id"
            :class="cn(
              'flex min-h-12 w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:cursor-default',
              CHOICE_CLASS[choiceState(choice.id)],
            )"
            @click="answer(choice.id)"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase">
              {{ choice.id }}
            </span>
            <span class="flex-1">{{ choice.label }}</span>
            <Loader2 v-if="submitting === choice.id" class="h-4 w-4 animate-spin" />
            <Check v-else-if="choiceState(choice.id) === 'correct'" class="h-4 w-4 text-green-600" aria-label="Correct answer" />
            <X v-else-if="choiceState(choice.id) === 'wrong'" class="h-4 w-4 text-destructive" aria-label="Your answer" />
          </button>
        </div>

        <p v-if="submitError" role="alert" class="text-sm text-destructive">{{ submitError }}</p>

        <div v-if="feedback" class="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" :class="cn('text-sm font-medium', feedback.correct ? 'text-green-600' : 'text-destructive')">
            {{ feedback.correct ? `Correct! +${feedback.points}` : 'Not quite.' }}
          </p>
          <Button ref="nextButton" @click="next">{{ allAnswered ? 'See results' : 'Next question' }}</Button>
        </div>
      </CardContent>
    </template>
  </Card>
</template>
