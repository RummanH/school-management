import { apiRequest, buildQueryString } from './client.js';

export const listThreads = () => apiRequest('/communication/threads');
export const getThread = (id) => apiRequest(`/communication/threads/${id}`);
export const createThread = (data) => apiRequest('/communication/threads', { method: 'POST', body: data });
export const replyToThread = (id, data) => apiRequest(`/communication/threads/${id}/messages`, { method: 'POST', body: data });
export const listRecipients = (role) => apiRequest(`/communication/recipients${buildQueryString({ role })}`);