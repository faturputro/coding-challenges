<script setup lang="ts">
import { ref, watchEffect } from 'vue';

const darkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') darkMode.value = saved === 'dark';
} catch {
  // Storage may be unavailable; the toggle still works for this visit.
}

watchEffect(() => {
  const theme = darkMode.value ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', darkMode.value);
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Keep the theme usable when storage is blocked.
  }
});
import { RouterView } from 'vue-router';
</script>

<template>
  <main class="mx-auto max-w-2xl px-6 py-16">
    <div class="mb-4 flex justify-end">
      <label class="flex cursor-pointer items-center gap-3 text-sm font-medium">
        <input v-model="darkMode" type="checkbox" role="switch" aria-label="Dark mode" class="peer sr-only">
        <span aria-hidden="true" class="relative h-6 w-11 rounded-full bg-muted-foreground transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
        <span>{{ darkMode ? 'Dark' : 'Light' }}</span>
      </label>
    </div>
    <RouterView />
  </main>
</template>
