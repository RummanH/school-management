import { apiRequest, buildQueryString } from './client.js';

export const studentDocumentDownloadUrl = (studentUserId, type, params = {}) =>
  `/api/students/${studentUserId}/documents/${type}/download${buildQueryString(params)}`;

export const myDocumentDownloadUrl = (type, params = {}) =>
  `/api/documents/me/${type}/download${buildQueryString(params)}`;

export const wardDocumentDownloadUrl = (studentUserId, type, params = {}) =>
  `/api/guardian/wards/${studentUserId}/documents/${type}/download${buildQueryString(params)}`;

export const verifyDocument = (code) => apiRequest(`/documents/verify/${encodeURIComponent(code)}`);
