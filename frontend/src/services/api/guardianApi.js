import { apiRequest } from './client.js';

// Admin — manage guardian ↔ student links
export const listWardLinks = (guardianId) => apiRequest(`/guardians/${guardianId}/wards`);
export const linkWard       = (guardianId, studentUserId) =>
  apiRequest(`/guardians/${guardianId}/wards`, { method: 'POST', body: { studentUserId } });
export const unlinkWard     = (guardianId, studentUserId) =>
  apiRequest(`/guardians/${guardianId}/wards/${studentUserId}`, { method: 'DELETE' });

// Admin — reverse lookup, for the student form's "Linked Guardian Account" picker
export const listGuardiansForStudent = (studentUserId) => apiRequest(`/students/${studentUserId}/guardians`);

// Guardian — own wards
export const getMyWards        = () => apiRequest('/guardian/wards');
export const getWardResults    = (studentUserId) => apiRequest(`/guardian/wards/${studentUserId}/results`);
export const getWardAttendance = (studentUserId) => apiRequest(`/guardian/wards/${studentUserId}/attendance`);
