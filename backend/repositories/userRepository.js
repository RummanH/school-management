export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || null,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUsers(client, tenantId = null) {
  let result;
  if (tenantId) {
    result = await client.query(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at
       FROM users u
       WHERE u.tenant_id = $1 AND u.role != 'system_developer'
       ORDER BY u.created_at DESC, u.name ASC`,
      [tenantId],
    );
  } else {
    result = await client.query(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at,
              t.name AS tenant_name
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.role != 'system_developer'
       ORDER BY u.created_at DESC, u.name ASC`,
    );
  }
  return result.rows.map((row) => ({
    ...mapUser(row),
    tenantName: row.tenant_name || null,
  }));
}

export async function findUserByEmailInTenant(client, email, tenantId) {
  const result = await client.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND tenant_id IS NOT DISTINCT FROM $2 LIMIT 1`,
    [email, tenantId || null],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

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

export async function findUserById(client, id) {
  const result = await client.query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
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

export async function insertUser(client, { id, tenantId, name, email, passwordHash, role, status }) {
  await client.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, tenantId || null, name, email.toLowerCase(), passwordHash, role, status || 'active'],
  );
}

export async function updateUser(client, { id, name, email, role, status, passwordHash }) {
  if (passwordHash) {
    await client.query(
      `UPDATE users SET name=$2, email=LOWER($3), role=$4, status=$5, password_hash=$6, updated_at=NOW() WHERE id=$1`,
      [id, name, email, role, status, passwordHash],
    );
  } else {
    await client.query(
      `UPDATE users SET name=$2, email=LOWER($3), role=$4, status=$5, updated_at=NOW() WHERE id=$1`,
      [id, name, email, role, status],
    );
  }
}

export async function updatePasswordHash(client, id, passwordHash) {
  await client.query(
    `UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1`,
    [id, passwordHash],
  );
}

export async function deleteUser(client, id) {
  await client.query(`DELETE FROM users WHERE id=$1`, [id]);
  await client.query(`DELETE FROM user_sessions WHERE user_id=$1`, [id]);
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
