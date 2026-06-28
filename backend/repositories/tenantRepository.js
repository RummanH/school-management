export function mapTenant(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    plan: row.plan,
    status: row.status,
    institutionType: row.institution_type || 'SCHOOL',
    logoUrl: row.logo_url || null,
    address: row.address || null,
    phone: row.phone || null,
    createdAt: row.created_at,
  };
}

export async function findTenantBySlug(client, slug) {
  const result = await client.query(`SELECT * FROM tenants WHERE slug = $1 LIMIT 1`, [slug]);
  return mapTenant(result.rows[0]);
}

export async function findTenantById(client, id) {
  const result = await client.query(`SELECT * FROM tenants WHERE id = $1 LIMIT 1`, [id]);
  return mapTenant(result.rows[0]);
}

export async function listTenants(client) {
  const result = await client.query(`SELECT * FROM tenants ORDER BY created_at DESC`);
  return result.rows.map(mapTenant);
}

export async function insertTenant(client, { id, name, slug, email, plan, institutionType, address, phone }) {
  const result = await client.query(
    `INSERT INTO tenants (id, name, slug, email, plan, status, institution_type, address, phone)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8)
     RETURNING *`,
    [id, name, slug, email, plan || 'free', institutionType || 'SCHOOL', address || null, phone || null],
  );
  return mapTenant(result.rows[0]);
}

export async function updateTenant(client, { id, name, email, plan, institutionType, address, phone }) {
  const result = await client.query(
    `UPDATE tenants
     SET name = $2, email = $3, plan = $4, institution_type = $5, address = $6, phone = $7
     WHERE id = $1
     RETURNING *`,
    [id, name, email, plan, institutionType, address || null, phone || null],
  );
  return mapTenant(result.rows[0]);
}

export async function setTenantStatus(client, id, status) {
  const result = await client.query(
    `UPDATE tenants SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return mapTenant(result.rows[0]);
}
