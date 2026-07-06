import { apiRequest, buildQueryString } from './client.js';

// Public
export const applyForAdmission = (data) => apiRequest('/admission/apply', { method: 'POST', body: data });
export const checkAdmissionStatus = (referenceCode) =>
  apiRequest(`/admission/status${buildQueryString({ referenceCode })}`);

// Admin
export const listAdmissions = (status) => apiRequest(`/admin/admissions${buildQueryString({ status })}`);
export const getAdmission = (id) => apiRequest(`/admin/admissions/${id}`);
export const updateAdmissionStatus = (id, data) => apiRequest(`/admin/admissions/${id}`, { method: 'PUT', body: data });
