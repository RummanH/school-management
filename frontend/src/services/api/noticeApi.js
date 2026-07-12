import { apiRequest, buildQueryString } from './client.js';

// Public — landing page
export const listPublicNotices = (type, schoolSlug) => apiRequest(`/notices/public${buildQueryString({ type, school: schoolSlug })}`);

// Portal feed — any authenticated user
export const getNoticeFeed = () => apiRequest('/notices/feed');

// Admin/teacher management
export const listAllNotices = () => apiRequest('/admin/notices');
export const createNotice   = (data) => apiRequest('/admin/notices', { method: 'POST', body: data });
export const updateNotice   = (id, data) => apiRequest(`/admin/notices/${id}`, { method: 'PUT', body: data });
export const deleteNotice   = (id) => apiRequest(`/admin/notices/${id}`, { method: 'DELETE' });
