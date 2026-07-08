import { listAuditLogs } from "../repositories/securityRepository.js";
import { rolePermissionMatrix } from "../middleware/permissions.js";

export class SecurityController {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  auditLogs = async (req, res, next) => {
    try {
      const tenantId = req.currentUser.role === 'system_developer' ? (req.query.tenantId || null) : req.currentUser.tenantId;
      const logs = await this.databaseManager.withClient((client) => listAuditLogs(client, tenantId, req.query.limit || 100));
      res.json({ logs });
    } catch (err) { next(err); }
  };

  permissionMatrix = async (_req, res, next) => {
    try { res.json({ matrix: rolePermissionMatrix() }); }
    catch (err) { next(err); }
  };
}