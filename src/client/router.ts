import { createRouter, createWebHistory } from 'vue-router';
import { onUnauthorized } from './lib/api';
import { checkAuth, clearAuth } from './lib/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    title?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/LoginPage.vue'),
      meta: { guestOnly: true, title: 'Log in' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('./pages/DashboardPage.vue'),
      meta: { requiresAuth: true, title: 'Dashboard' },
    },
    {
      // Public: players are anonymous and identified by the cookie from /session/init.
      path: '/play/:code',
      name: 'play',
      component: () => import('./pages/PlayPage.vue'),
      meta: { title: 'Play' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});

/** Only same-app paths, so `?redirect=` can't send users to another site. */
export const safeRedirect = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth && !(await checkAuth())) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && (await checkAuth())) {
    return safeRedirect(to.query.redirect);
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Real-Time Quiz` : 'Real-Time Quiz';
});

// An expired session on any API call sends the admin back to the login page.
onUnauthorized(() => {
  clearAuth();
  const current = router.currentRoute.value;
  if (current.meta.requiresAuth) {
    router.replace({ name: 'login', query: { redirect: current.fullPath } });
  }
});
