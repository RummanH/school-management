import crypto from "node:crypto";
import { assert } from "../lib/errors.js";
import { verifyPassword, hashPassword, validatePasswordStrength } from "../lib/passwords.js";
import { createId } from "../lib/ids.js";
import { createSessionToken, hashSessionToken } from "../lib/sessionTokens.js";
import {
  findUserByEmail,
  findActiveUserBySessionTokenHash,
  insertUserSession,
  deleteUserSessionByTokenHash,
  deleteExpiredUserSessions,
  updatePasswordHash,
} from "../repositories/userRepository.js";
import { findTenantBySlug } from "../repositories/tenantRepository.js";
import {
  insertLoginAttempt,
  countRecentFailedLogins,
  findActiveLockout,
  upsertLockout,
  clearLockout,
  insertPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenUsed,
  insertAuditLog,
} from "../repositories/securityRepository.js";

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

      const lockout = await findActiveLockout(client, trimEmail, tenantId);
      assert(!lockout, "Too many failed login attempts. Please try again later.", 429);

      const userRes = await findUserByEmail(client, trimEmail, tenantId);
      const userRow = userRes.rows[0] || null;
      const validPassword = userRow ? await verifyPassword(trimPassword, userRow.password_hash) : false;

      if (!userRow || !validPassword) {
        await insertLoginAttempt(client, { email: trimEmail, tenantId, ipAddress: requestMeta.ip || '', success: false, failureReason: 'invalid_credentials' });
        const failedCount = await countRecentFailedLogins(client, trimEmail, tenantId, 15);
        if (failedCount >= 5) await upsertLockout(client, trimEmail, tenantId, failedCount, 15);
        assert(false, "Invalid email or password.", 401);
      }

      await insertLoginAttempt(client, { email: trimEmail, tenantId: userRow.tenant_id || null, ipAddress: requestMeta.ip || '', success: true });
      await clearLockout(client, trimEmail, userRow.tenant_id || null);

      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + this.getSessionMaxAgeMs());

      await insertUserSession(client, { id: createId("session"), userId: userRow.id, tokenHash, expiresAt });
      await insertAuditLog(client, {
        tenantId: userRow.tenant_id || null,
        actorUserId: userRow.id,
        actorRole: userRow.role,
        action: 'auth.login',
        entityType: 'user',
        entityId: userRow.id,
        method: 'POST',
        path: '/api/auth/login',
        ipAddress: requestMeta.ip || '',
        userAgent: requestMeta.userAgent || '',
      });

      return {
        token,
        expiresAt,
        user: { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role, tenantId: userRow.tenant_id || null },
        tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, logoUrl: tenant.logo_url || '', address: tenant.address || '', phone: tenant.phone || '', email: tenant.email || '' } : null,
      };
    });
  }

  async requestPasswordReset({ email, orgSlug }, requestMeta = {}) {
    const trimEmail = String(email || '').trim().toLowerCase();
    const slug = String(orgSlug || '').trim().toLowerCase();
    assert(trimEmail, "Email is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      let tenantId = null;
      if (slug) {
        const tenant = (await findTenantBySlug(client, slug)).rows[0] || null;
        tenantId = tenant?.id || null;
      }

      const user = (await findUserByEmail(client, trimEmail, tenantId)).rows[0] || null;
      if (!user) return { success: true };

      const token = crypto.randomBytes(32).toString('base64url');
      await insertPasswordResetToken(client, {
        id: createId('pwreset'),
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        requestedIp: requestMeta.ip || '',
      });
      await insertAuditLog(client, {
        tenantId: user.tenant_id || null,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.password_reset_requested',
        entityType: 'user',
        entityId: user.id,
        method: 'POST',
        path: '/api/auth/password-reset/request',
        ipAddress: requestMeta.ip || '',
        userAgent: requestMeta.userAgent || '',
      });
      return { success: true, resetToken: token };
    });
  }

  async confirmPasswordReset({ token, password }, requestMeta = {}) {
    const cleanToken = String(token || '').trim();
    const newPassword = String(password || '');
    const strengthError = validatePasswordStrength(newPassword);
    assert(cleanToken, "Reset token is required.", 400);
    assert(!strengthError, strengthError, 400);

    return this.databaseManager.withTransaction(async (client) => {
      const reset = await findPasswordResetToken(client, hashSessionToken(cleanToken));
      assert(reset, "Password reset link is invalid or expired.", 400);
      await updatePasswordHash(client, reset.user_id, await hashPassword(newPassword));
      await markPasswordResetTokenUsed(client, reset.id);
      await insertAuditLog(client, {
        tenantId: reset.tenant_id || null,
        actorUserId: reset.user_id,
        actorRole: 'user',
        action: 'auth.password_reset_completed',
        entityType: 'user',
        entityId: reset.user_id,
        method: 'POST',
        path: '/api/auth/password-reset/confirm',
        ipAddress: requestMeta.ip || '',
        userAgent: requestMeta.userAgent || '',
      });
      return { success: true };
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
        ? { id: row.tenant_id, name: row.tenant_name, slug: row.tenant_slug, status: row.tenant_status, logoUrl: row.tenant_logo_url || '', address: row.tenant_address || '', phone: row.tenant_phone || '', email: row.tenant_email || '' }
        : null,
    };
  }

  async logout(token) {
    if (!token) return;
    const tokenHash = hashSessionToken(token);
    await this.databaseManager.withTransaction((c) => deleteUserSessionByTokenHash(c, tokenHash));
  }
}