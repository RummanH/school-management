import { apiRequest } from './client.js';

export async function login({ email, password, orgSlug }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password, orgSlug: orgSlug || undefined },
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

export async function getAccountProfile() {
  return apiRequest('/account/profile');
}

export async function updateAccountProfile(data) {
  return apiRequest('/account/profile', { method: 'PUT', body: data });
}

export async function changeMyPassword(data) {
  return apiRequest('/account/change-password', { method: 'POST', body: data });
}

export async function requestPasswordReset(data) {
  return apiRequest('/auth/password-reset/request', { method: 'POST', body: data });
}

export async function confirmPasswordReset(data) {
  return apiRequest('/auth/password-reset/confirm', { method: 'POST', body: data });
}
