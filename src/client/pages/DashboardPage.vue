<script setup lang="ts">
import { ref } from 'vue';
import { Card, CardContent, CardDescription, CardHeader } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import SessionList from '@client/components/SessionList.vue';
import NewGameDialog from '@client/components/NewGameDialog.vue';
import { currentAdmin } from '@client/lib/auth';

const sessionList = ref<InstanceType<typeof SessionList> | null>(null);
</script>

<template>
  <div>
    <Card>
      <CardHeader>
        <h1 class="text-2xl font-semibold">Real-Time Quiz</h1>
        <CardDescription>
          Ready to build your quiz experience<template v-if="currentAdmin">, {{ currentAdmin.email }}</template>.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-3">
        <NewGameDialog @created="sessionList?.reload()">
          <template #trigger>
            <Button>New Game</Button>
          </template>
        </NewGameDialog>
      </CardContent>
    </Card>
    <SessionList ref="sessionList" class="mt-6" />
  </div>
</template>
