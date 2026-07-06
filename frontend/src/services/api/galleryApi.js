import { apiRequest } from './client.js';

// Public — landing page
export const listPublicGallery = () => apiRequest('/gallery/public');

// Admin management
export const listAllGallery    = () => apiRequest('/admin/gallery');
export const createGalleryItem = (data) => apiRequest('/admin/gallery', { method: 'POST', body: data });
export const updateGalleryItem = (id, data) => apiRequest(`/admin/gallery/${id}`, { method: 'PUT', body: data });
export const deleteGalleryItem = (id) => apiRequest(`/admin/gallery/${id}`, { method: 'DELETE' });
