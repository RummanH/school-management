import { apiRequest } from './client.js';

export async function login({ email, password, orgSlug }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, orgSlug: orgSlug || undefined }),
  });
}

export async function logout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return apiRequest('/auth/me');
}

export async function getMyProfile() {
  return apiRequest('/me/profile');
}
