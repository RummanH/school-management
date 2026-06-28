export function findUserByEmail(client, email, tenantId = null) {
  return client.query(
    `SELECT * FROM users
     WHERE email = $1
       AND ($2::text IS NULL OR tenant_id = $2)
       AND status = 'active'
     LIMIT 1`,
    [email, tenantId],
  );
}

export function findUserById(client, id) {
  return client.query(
    `SELECT id, tenant_id, name, email, role, status, created_at FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
}

export function findActiveUserBySessionTokenHash(client, tokenHash) {
  return client.query(
    `SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.status,
            t.name  AS tenant_name,
            t.slug  AS tenant_slug,
            t.status AS tenant_status
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.status = 'active'
     LIMIT 1`,
    [tokenHash],
  );
}

export function insertUser(client, { id, tenantId, name, email, passwordHash, role }) {
  return client.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, tenantId || null, name, email, passwordHash, role],
  );
}

export function insertUserSession(client, { id, userId, tokenHash, expiresAt }) {
  return client.query(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, tokenHash, expiresAt],
  );
}

export function deleteUserSessionByTokenHash(client, tokenHash) {
  return client.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
}

export function deleteExpiredUserSessions(client) {
  return client.query(`DELETE FROM user_sessions WHERE expires_at <= NOW()`);
}

export function countUsersWithRole(client, role) {
  return client.query(`SELECT COUNT(*) FROM users WHERE role = $1`, [role]);
}
