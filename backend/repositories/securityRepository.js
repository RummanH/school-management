import { createId } from "../lib/ids.js";

export async function insertAuditLog(client, data) {
  await client.query(
    `INSERT INTO audit_logs
       (id, tenant_id, actor_user_id, actor_role, action, entity_type, entity_id, method, path, ip_address, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
    [createId('audit'), data.tenantId || null, data.actorUserId || null, data.actorRole || '', data.action,
     data.entityType || '', data.entityId || '', data.method || '', data.path || '', data.ipAddress || '', data.userAgent || '', JSON.stringify(data.metadata || {})],
  );
}

export async function listAuditLogs(client, tenantId, limit = 100) {
  const result = await client.query(
    `SELECT al.*, u.name AS actor_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE ($1::text IS NULL OR al.tenant_id = $1)
      ORDER BY al.created_at DESC
      LIMIT $2`,
    [tenantId || null, Math.min(Number(limit || 100), 500)],
  );
  return result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name || '',
    actorEmail: row.actor_email || '',
    actorRole: row.actor_role || '',
    action: row.action,
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    method: row.method,
    path: row.path,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }));
}

export async function insertLoginAttempt(client, data) {
  await client.query(
    `INSERT INTO login_attempts (id, email, tenant_id, ip_address, success, failure_reason)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [createId('login'), data.email, data.tenantId || null, data.ipAddress || '', Boolean(data.success), data.failureReason || ''],
  );
}

export async function countRecentFailedLogins(client, email, tenantId, minutes = 15) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM login_attempts
      WHERE email = $1
        AND tenant_id IS NOT DISTINCT FROM $2
        AND success = false
        AND created_at > NOW() - ($3::int * INTERVAL '1 minute')`,
    [email, tenantId || null, minutes],
  );
  return Number(result.rows[0]?.count || 0);
}

export async function findActiveLockout(client, email, tenantId) {
  const result = await client.query(
    `SELECT * FROM account_lockouts
      WHERE email = $1 AND tenant_id IS NOT DISTINCT FROM $2 AND locked_until > NOW()
      LIMIT 1`,
    [email, tenantId || null],
  );
  return result.rows[0] || null;
}

export async function upsertLockout(client, email, tenantId, failedCount, minutes = 15) {
  await client.query(
    `INSERT INTO account_lockouts (id, email, tenant_id, locked_until, failed_count)
     VALUES ($1,$2,$3,NOW() + ($5::int * INTERVAL '1 minute'),$4)
     ON CONFLICT (email, tenant_id) DO UPDATE
       SET locked_until = NOW() + ($5::int * INTERVAL '1 minute'), failed_count=$4, updated_at=NOW()`,
    [createId('lock'), email, tenantId || null, failedCount, minutes],
  );
}

export async function clearLockout(client, email, tenantId) {
  await client.query(`DELETE FROM account_lockouts WHERE email=$1 AND tenant_id IS NOT DISTINCT FROM $2`, [email, tenantId || null]);
}

export async function insertPasswordResetToken(client, data) {
  await client.query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, requested_ip)
     VALUES ($1,$2,$3,$4,$5)`,
    [data.id, data.userId, data.tokenHash, data.expiresAt, data.requestedIp || ''],
  );
}

export async function findPasswordResetToken(client, tokenHash) {
  const result = await client.query(
    `SELECT prt.*, u.email, u.tenant_id
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
      WHERE prt.token_hash=$1 AND prt.used_at IS NULL AND prt.expires_at > NOW()
      LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0] || null;
}

export async function markPasswordResetTokenUsed(client, id) {
  await client.query(`UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1`, [id]);
}