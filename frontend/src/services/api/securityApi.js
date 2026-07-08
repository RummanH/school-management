import { apiRequest } from './client.js';

export const getAuditLogs = () => apiRequest('/security/audit-logs');
export const getPermissionMatrix = () => apiRequest('/security/permissions');