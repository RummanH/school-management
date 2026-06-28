export const USER_ROLES = {
  SYSTEM_DEVELOPER: "system_developer",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  OPERATOR: "operator",
};

export const USER_ROLE_VALUES = Object.values(USER_ROLES);
export const TENANT_ROLE_VALUES = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR];
