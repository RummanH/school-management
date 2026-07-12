export const PERMISSIONS = {
  platformManage: ['system_developer'],
  adminManage: ['system_developer', 'admin'],
  staffManage: ['system_developer', 'admin'],
  academicWrite: ['system_developer', 'admin', 'teacher'],
  financeManage: ['system_developer', 'admin', 'accountant'],
  payrollManage: ['system_developer', 'admin', 'accountant'],
  hrView: ['system_developer', 'admin', 'accountant'],
  communicationUse: ['system_developer', 'admin', 'teacher', 'guardian', 'student', 'accountant'],
  studentDocuments: ['system_developer', 'admin', 'teacher', 'accountant'],
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