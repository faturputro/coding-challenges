import './assets/css/index.css';
import { openobserveLogs } from '@openobserve/browser-logs';
import { openobserveRum } from '@openobserve/browser-rum';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { ensureUserSession } from './lib/session';

// Real user monitoring and browser logs, sent to OpenObserve only when configured at build time.
const clientToken = import.meta.env.VITE_OPENOBSERVE_CLIENT_TOKEN;
const site = import.meta.env.VITE_OPENOBSERVE_SITE;

if (clientToken && site) {
  const rumOptions = {
    clientToken,
    applicationId: import.meta.env.VITE_OPENOBSERVE_APP_ID ?? 'quiz-web',
    site,
    organizationIdentifier: import.meta.env.VITE_OPENOBSERVE_ORG ?? 'default',
    service: 'quiz-web',
    env: import.meta.env.MODE,
    version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
    apiVersion: 'v1' as const,
  };

  openobserveRum.init({
    ...rumOptions,
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    // Players type their names into the join form; keep typed text out of recordings.
    defaultPrivacyLevel: 'mask-user-input',
  });

  openobserveLogs.init({
    ...rumOptions,
    forwardErrorsToLogs: true,
  });
}

// Start registering the user right away without blocking the first render.
ensureUserSession().catch((error) => console.error(error));

createApp(App).use(router).mount('#app');
