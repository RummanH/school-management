import { apiRequest, buildQueryString } from './client.js';

export async function getStats() {
  return apiRequest('/admin/stats');
}

export async function getReports(params = {}) {
  return apiRequest(`/admin/reports${buildQueryString(params)}`);
}

export async function getContacts({ limit = 20, offset = 0, status = '' } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (status) params.set('status', status);
  return apiRequest(`/admin/contacts?${params}`);
}

export async function markContactRead(id) {
  return apiRequest(`/admin/contacts/${id}/read`, { method: 'PATCH' });
}
