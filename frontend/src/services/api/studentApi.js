import { apiRequest } from './client.js';

export const listStudents   = ()          => apiRequest('/students');
export const createStudent  = (data)      => apiRequest('/students', { method: 'POST', body: data });
export const updateStudent  = (uid, data) => apiRequest(`/students/${uid}`, { method: 'PUT', body: data });
export const deleteStudent  = (uid)       => apiRequest(`/students/${uid}`, { method: 'DELETE' });
