import { insertAuditLog } from "../repositories/securityRepository.js";

export function auditAction(databaseManager, action, entityType = '') {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const actor = req.currentUser || {};
      const entityId = req.params.id || req.params.userId || req.params.documentId || req.params.classId || '';
      databaseManager.withClient((client) => insertAuditLog(client, {
        tenantId: actor.tenantId || null,
        actorUserId: actor.id || null,
        actorRole: actor.role || '',
        action,
        entityType,
        entityId,
        method: req.method,
        path: req.originalUrl || req.url,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        metadata: { params: req.params, query: req.query },
      })).catch(() => {});
    });
    next();
  };
}

export function auditMutations(databaseManager) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    return auditAction(databaseManager, `${req.method} ${req.path}`, req.path.split('/').filter(Boolean)[0] || 'api')(req, res, next);
  };
}