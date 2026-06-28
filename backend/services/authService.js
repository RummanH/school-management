import { assert } from "../lib/errors.js";
import { verifyPassword } from "../lib/passwords.js";
import { createId } from "../lib/ids.js";
import { createSessionToken, hashSessionToken } from "../lib/sessionTokens.js";
import {
  findUserByEmail,
  findActiveUserBySessionTokenHash,
  insertUserSession,
  deleteUserSessionByTokenHash,
  deleteExpiredUserSessions,
} from "../repositories/userRepository.js";
import { findTenantBySlug } from "../repositories/tenantRepository.js";

export class AuthService {
  constructor(databaseManager, env) {
    this.databaseManager = databaseManager;
    this.env = env;
  }

  getSessionMaxAgeMs() {
    return this.env.SESSION_DAYS * 24 * 60 * 60 * 1000;
  }

  async login({ email, password, orgSlug }, requestMeta = {}) {
    const trimEmail = String(email || "").trim().toLowerCase();
    const trimPassword = String(password || "");
    const slug = String(orgSlug || "").trim().toLowerCase();

    assert(trimEmail && trimPassword, "Email and password are required.");

    this.databaseManager.withClient((c) => deleteExpiredUserSessions(c)).catch(() => {});

    return this.databaseManager.withTransaction(async (client) => {
      let tenant = null;
      let tenantId = null;

      if (slug) {
        const res = await findTenantBySlug(client, slug);
        tenant = res.rows[0] || null;
        assert(tenant, "Organization not found. Check your organization code.", 401);
        assert(tenant.status === "active", "This organization is inactive.", 403);
        tenantId = tenant.id;
      }

      const userRes = await findUserByEmail(client, trimEmail, tenantId);
      const userRow = userRes.rows[0] || null;

      const validPassword = userRow ? await verifyPassword(trimPassword, userRow.password_hash) : false;
      assert(userRow && validPassword, "Invalid email or password.", 401);

      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + this.getSessionMaxAgeMs());

      await insertUserSession(client, { id: createId("session"), userId: userRow.id, tokenHash, expiresAt });

      return {
        token,
        expiresAt,
        user: { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role, tenantId: userRow.tenant_id || null },
        tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
      };
    });
  }

  async getUserFromSessionToken(token) {
    if (!token) return null;
    const tokenHash = hashSessionToken(token);
    const result = await this.databaseManager.withClient((c) => findActiveUserBySessionTokenHash(c, tokenHash));
    const row = result.rows[0];
    if (!row) return null;

    return {
      user: { id: row.id, name: row.name, email: row.email, role: row.role, tenantId: row.tenant_id || null },
      tenant: row.tenant_id
        ? { id: row.tenant_id, name: row.tenant_name, slug: row.tenant_slug, status: row.tenant_status }
        : null,
    };
  }

  async logout(token) {
    if (!token) return;
    const tokenHash = hashSessionToken(token);
    await this.databaseManager.withTransaction((c) => deleteUserSessionByTokenHash(c, tokenHash));
  }
}
