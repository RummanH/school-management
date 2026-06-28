export const USER_ROLES = {
  SYSTEM_DEVELOPER: "system_developer",
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
  GUARDIAN: "guardian",
};

export const USER_ROLE_VALUES = Object.values(USER_ROLES);

// All roles that belong to a tenant (i.e. not the platform system_developer)
export const TENANT_ROLE_VALUES = [
  USER_ROLES.ADMIN,
  USER_ROLES.TEACHER,
  USER_ROLES.STUDENT,
  USER_ROLES.GUARDIAN,
];
