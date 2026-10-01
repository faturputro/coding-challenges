import { ref } from 'vue';
import { fetchProfile, login as loginRequest, type AdminProfile } from './api';

/** The logged-in admin, or null when unknown or logged out. */
export const currentAdmin = ref<AdminProfile | null>(null);

/**
 * Resolves whether the admin cookie is valid. The cookie is HttpOnly, so the
 * only way to know is to ask the server; the answer is cached until cleared.
 */
export const checkAuth = async (): Promise<boolean> => {
  if (currentAdmin.value) return true;
  try {
    currentAdmin.value = await fetchProfile();
    return true;
  } catch {
    return false;
  }
};

export const login = async (email: string, password: string) => {
  await loginRequest(email, password);
  currentAdmin.value = await fetchProfile();
};

export const clearAuth = () => {
  currentAdmin.value = null;
};
