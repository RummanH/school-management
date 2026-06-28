import { apiRequest } from './client.js';

export async function listTenants() {
  return apiRequest('/platform/tenants');
}

export async function createTenant(data) {
  return apiRequest('/platform/tenants', { method: 'POST', body: data });
}

export async function updateTenant(id, data) {
  return apiRequest(`/platform/tenants/${id}`, { method: 'PUT', body: data });
}

export async function setTenantStatus(id, status) {
  return apiRequest(`/platform/tenants/${id}/status`, { method: 'PATCH', body: { status } });
}
