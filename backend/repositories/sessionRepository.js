export function insertSession(client, { id, userId, token, expiresAt }) {
  return client.query(
    'INSERT INTO admin_sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
    [id, userId, token, expiresAt],
  );
}

export function findSessionByToken(client, token) {
  return client.query(
    `SELECT s.*, u.name, u.email, u.role
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [token],
  );
}

export function deleteSession(client, token) {
  return client.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
}

export function deleteExpiredSessions(client) {
  return client.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
}
