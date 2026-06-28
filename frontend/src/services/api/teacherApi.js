import { apiRequest } from './client.js';

export const listTeachers   = ()          => apiRequest('/teachers');
export const createTeacher  = (data)      => apiRequest('/teachers', { method: 'POST', body: data });
export const updateTeacher  = (uid, data) => apiRequest(`/teachers/${uid}`, { method: 'PUT', body: data });
export const deleteTeacher  = (uid)       => apiRequest(`/teachers/${uid}`, { method: 'DELETE' });
