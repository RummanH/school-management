import { apiRequest } from './client.js';

export const listStudents   = ()         => apiRequest('/students');
export const createStudent  = (data)     => apiRequest('/students', { method: 'POST', body: JSON.stringify(data) });
export const updateStudent  = (uid, data) => apiRequest(`/students/${uid}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStudent  = (uid)      => apiRequest(`/students/${uid}`, { method: 'DELETE' });
