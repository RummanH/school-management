import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { hashPassword, validatePasswordStrength, generateTempPassword } from "../lib/passwords.js";
import { USER_ROLES, TENANT_ROLE_VALUES } from "../lib/roles.js";
import {
  listUsers,
  findUserById,
  findUserByEmailInTenant,
  insertUser,
  updateUser,
  updatePasswordHash,
  deleteUser,
} from "../repositories/userRepository.js";
import { findTenantById } from "../repositories/tenantRepository.js";

// system_developer and admin can manage all tenant roles
function allowedRolesFor(actorRole) {
  if (actorRole === USER_ROLES.SYSTEM_DEVELOPER) return TENANT_ROLE_VALUES;
  if (actorRole === USER_ROLES.ADMIN) return TENANT_ROLE_VALUES;
  return [];
}

export class UserService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async list(actor) {
    const tenantId = actor.role === USER_ROLES.SYSTEM_DEVELOPER ? null : actor.tenantId;
    return this.databaseManager.withClient((client) => listUsers(client, tenantId));
  }

  async create(input, actor) {
    const name = (input.name || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    const role = (input.role || '').trim();
    const status = (input.status || 'active').trim();

    assert(name, "Name is required.", 400);
    assert(email, "Email is required.", 400);
    assert(password, "Password is required.", 400);
    assert(TENANT_ROLE_VALUES.includes(role), "Invalid role.", 400);
    assert(allowedRolesFor(actor.role).includes(role), "You cannot assign this role.", 403);
    assert(['active', 'inactive'].includes(status), "Invalid status.", 400);

    const strengthError = validatePasswordStrength(password);
    assert(!strengthError, strengthError, 400);

    return this.databaseManager.withTransaction(async (client) => {
      let tenantId = actor.tenantId;

      if (actor.role === USER_ROLES.SYSTEM_DEVELOPER) {
        assert(input.tenantId, "An organization is required.", 400);
        const tenant = await findTenantById(client, input.tenantId);
        assert(tenant, "Organization not found.", 404);
        tenantId = tenant.id;
      }

      const existing = await findUserByEmailInTenant(client, email, tenantId);
      assert(!existing, "A user with this email already exists in this organization.", 409);

      await insertUser(client, {
        id: createId("user"),
        tenantId,
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
        status,
      });

      return listUsers(client, actor.role === USER_ROLES.SYSTEM_DEVELOPER ? null : tenantId);
    });
  }

  async update(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, id);
      assert(existing, "User not found.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existing.tenant_id === actor.tenantId, "User not found.", 404);
      }
      assert(allowedRolesFor(actor.role).includes(existing.role), "Forbidden.", 403);
      assert(id !== actor.id || input.status !== 'inactive', "You cannot deactivate your own account.", 400);

      const name = (input.name || existing.name).trim();
      const email = (input.email || existing.email).trim().toLowerCase();
      const role = input.role ?? existing.role;
      const status = input.status ?? existing.status;

      assert(allowedRolesFor(actor.role).includes(role), "You cannot assign this role.", 403);

      if (email !== existing.email) {
        const dup = await findUserByEmailInTenant(client, email, existing.tenant_id);
        assert(!dup || dup.id === id, "A user with this email already exists.", 409);
      }

      let passwordHash = null;
      if (input.password) {
        const strengthError = validatePasswordStrength(input.password);
        assert(!strengthError, strengthError, 400);
        passwordHash = await hashPassword(String(input.password));
      }

      await updateUser(client, { id, name, email, role, status, passwordHash });

      const tenantId = actor.role === USER_ROLES.SYSTEM_DEVELOPER ? null : actor.tenantId;
      return listUsers(client, tenantId);
    });
  }

  async remove(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, id);
      assert(existing, "User not found.", 404);
      assert(id !== actor.id, "You cannot delete your own account.", 400);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existing.tenant_id === actor.tenantId, "User not found.", 404);
      }
      assert(allowedRolesFor(actor.role).includes(existing.role), "Forbidden.", 403);

      await deleteUser(client, id);

      const tenantId = actor.role === USER_ROLES.SYSTEM_DEVELOPER ? null : actor.tenantId;
      return listUsers(client, tenantId);
    });
  }

  async resetPassword(id, actor) {
    const tempPassword = generateTempPassword();
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, id);
      assert(existing, "User not found.", 404);
      assert(id !== actor.id, "You cannot reset your own password this way.", 400);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existing.tenant_id === actor.tenantId, "User not found.", 404);
      }
      assert(allowedRolesFor(actor.role).includes(existing.role), "Forbidden.", 403);

      await updatePasswordHash(client, id, await hashPassword(tempPassword));

      const tenantId = actor.role === USER_ROLES.SYSTEM_DEVELOPER ? null : actor.tenantId;
      const users = await listUsers(client, tenantId);
      return { users, tempPassword };
    });
  }
}
