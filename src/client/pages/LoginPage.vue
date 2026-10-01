<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { ApiError } from '@client/lib/api';
import { login } from '@client/lib/auth';
import { cn } from '@client/lib/utils';
import { safeRedirect } from '@client/router';

const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);

const errorMessage = (e: unknown) => {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Incorrect email or password.';
    if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  }
  return 'Could not log in right now. Please try again.';
};

const submit = async () => {
  if (submitting.value) return;
  error.value = null;

  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.';
    return;
  }

  submitting.value = true;
  try {
    await login(email.value.trim(), password.value);
    await router.replace(safeRedirect(route.query.redirect));
  } catch (e) {
    error.value = errorMessage(e);
    password.value = '';
  } finally {
    submitting.value = false;
  }
};

const inputClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
</script>

<template>
  <Card class="mx-auto max-w-sm">
    <CardHeader>
      <CardTitle>Log in</CardTitle>
      <CardDescription>Sign in as an admin to manage quiz sessions.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="grid gap-4" novalidate @submit.prevent="submit">
        <div class="grid gap-2">
          <label for="login-email" class="text-sm font-medium">Email</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="username"
            inputmode="email"
            placeholder="admin@mail.com"
            autofocus
            :disabled="submitting"
            :aria-invalid="!!error"
            :aria-describedby="error ? 'login-error' : undefined"
            :class="cn(inputClass, error && 'border-destructive')"
          >
        </div>

        <div class="grid gap-2">
          <label for="login-password" class="text-sm font-medium">Password</label>
          <div class="relative">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              :disabled="submitting"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'login-error' : undefined"
              :class="cn(inputClass, 'pr-10', error && 'border-destructive')"
            >
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <p v-if="error" id="login-error" role="alert" class="text-sm text-destructive">{{ error }}</p>

        <Button type="submit" class="w-full" :loading="submitting">Log in</Button>
      </form>
    </CardContent>
  </Card>
</template>
