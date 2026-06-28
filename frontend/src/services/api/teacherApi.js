import { apiRequest } from './client.js';

export const listTeachers   = ()         => apiRequest('/teachers');
export const createTeacher  = (data)     => apiRequest('/teachers', { method: 'POST', body: JSON.stringify(data) });
export const updateTeacher  = (uid, data) => apiRequest(`/teachers/${uid}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTeacher  = (uid)      => apiRequest(`/teachers/${uid}`, { method: 'DELETE' });
