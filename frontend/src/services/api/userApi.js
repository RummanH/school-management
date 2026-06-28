import { apiRequest } from './client.js';

export async function listUsers() {
  return apiRequest('/users');
}

export async function createUser(data) {
  return apiRequest('/users', { method: 'POST', body: data });
}

export async function updateUser(id, data) {
  return apiRequest(`/users/${id}`, { method: 'PUT', body: data });
}

export async function deleteUser(id) {
  return apiRequest(`/users/${id}`, { method: 'DELETE' });
}

export async function resetUserPassword(id) {
  return apiRequest(`/users/${id}/reset-password`, { method: 'POST' });
}
