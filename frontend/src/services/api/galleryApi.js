import { apiRequest, buildQueryString } from './client.js';

// Public — landing page
export const listPublicGallery = (schoolSlug) => apiRequest(`/gallery/public${buildQueryString({ school: schoolSlug })}`);

// Admin management
export const listAllGallery    = () => apiRequest('/admin/gallery');
export const createGalleryItem = (data) => apiRequest('/admin/gallery', { method: 'POST', body: data });
export const updateGalleryItem = (id, data) => apiRequest(`/admin/gallery/${id}`, { method: 'PUT', body: data });
export const deleteGalleryItem = (id) => apiRequest(`/admin/gallery/${id}`, { method: 'DELETE' });
