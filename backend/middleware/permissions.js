// system_developer is a platform-level role with no tenant_id, so it's
// deliberately left out of every tenant-scoped permission below
// (academicWrite/financeManage/payrollManage/hrView/studentDocuments) even
// though it can do everything within adminManage/platformManage/securityAudit.
// The dashboard nav already never links a system_developer to Fees/HR/Academic
// (see DashboardSidebar.jsx's PLATFORM_NAV_GROUPS); this makes the backend
// agree, instead of those routes silently 200'ing with an empty result set
// for a user who queries with tenantId = null.
export const PERMISSIONS = {
  platformManage: ['system_developer'],
  adminManage: ['system_developer', 'admin'],
  staffManage: ['system_developer', 'admin'],
  academicWrite: ['admin', 'teacher'],
  financeManage: ['admin', 'accountant'],
  payrollManage: ['admin', 'accountant'],
  hrView: ['admin', 'accountant'],
  communicationUse: ['system_developer', 'admin', 'teacher', 'guardian', 'student', 'accountant'],
  studentDocuments: ['admin', 'teacher', 'accountant'],
  guardianUse: ['guardian'],
  dataExport: ['system_developer', 'admin'],
  securityAudit: ['system_developer', 'admin'],
};

export function can(role, permission) {
  return Boolean(PERMISSIONS[permission]?.includes(role));
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.currentUser) return res.status(401).json({ message: 'Authentication required.' });
    if (!can(req.currentUser.role, permission)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

export function rolePermissionMatrix() {
  const roles = ['system_developer', 'admin', 'accountant', 'teacher', 'student', 'guardian'];
  return roles.map((role) => ({
    role,
    permissions: Object.fromEntries(Object.keys(PERMISSIONS).map((permission) => [permission, can(role, permission)])),
  }));
}