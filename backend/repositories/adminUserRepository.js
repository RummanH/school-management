export function findAdminUserByEmail(client, email) {
  return client.query('SELECT * FROM admin_users WHERE email = $1 LIMIT 1', [email]);
}

export function findAdminUserById(client, id) {
  return client.query('SELECT id, name, email, role, created_at FROM admin_users WHERE id = $1 LIMIT 1', [id]);
}

export function insertAdminUser(client, { id, name, email, passwordHash, role }) {
  return client.query(
    'INSERT INTO admin_users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
    [id, name, email, passwordHash, role],
  );
}

export function countAdminUsers(client) {
  return client.query('SELECT COUNT(*) FROM admin_users');
}
