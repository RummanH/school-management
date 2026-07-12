import { apiRequest, buildQueryString } from './client.js';

export const listThreads = () => apiRequest('/communication/threads');
export const getThread = (id) => apiRequest(`/communication/threads/${id}`);
export const createThread = (data) => apiRequest('/communication/threads', { method: 'POST', body: data });
export const replyToThread = (id, data) => apiRequest(`/communication/threads/${id}/messages`, { method: 'POST', body: data });
export const listRecipients = (role) => apiRequest(`/communication/recipients${buildQueryString({ role })}`);

export const listOlderMessages = (threadId, before) => apiRequest(`/communication/threads/${threadId}/messages${buildQueryString({ before })}`);
export const editMessage = (messageId, body) => apiRequest(`/communication/messages/${messageId}`, { method: 'PUT', body: { body } });
export const deleteMessage = (messageId) => apiRequest(`/communication/messages/${messageId}`, { method: 'DELETE' });

export const renameGroup = (threadId, topic) => apiRequest(`/communication/threads/${threadId}`, { method: 'PATCH', body: { topic } });
export const addGroupMembers = (threadId, userIds) => apiRequest(`/communication/threads/${threadId}/participants`, { method: 'POST', body: { userIds } });
export const removeGroupMember = (threadId, userId) => apiRequest(`/communication/threads/${threadId}/participants/${userId}`, { method: 'DELETE' });