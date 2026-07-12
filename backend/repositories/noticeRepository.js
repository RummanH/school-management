export function mapNotice(row) {
  if (!row) return null;
  return {
    id:          row.id,
    tenantId:    row.tenant_id,
    type:        row.type,
    title:       row.title,
    body:        row.body,
    audience:    row.audience,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdBy:   row.created_by,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export async function listPublicNotices(client, tenantId, type, limit) {
  const result = await client.query(
    `SELECT * FROM notices
      WHERE tenant_id = $1 AND type = $2 AND audience = 'public' AND is_published = true
      ORDER BY published_at DESC
      LIMIT $3`,
    [tenantId, type, limit],
  );
  return result.rows.map(mapNotice);
}

export async function listForAudience(client, role, tenantId) {
  const result = await client.query(
    `SELECT * FROM notices
      WHERE tenant_id = $1 AND is_published = true AND audience IN ('all_portal', 'public', $2)
      ORDER BY published_at DESC`,
    [tenantId, role],
  );
  return result.rows.map(mapNotice);
}

export async function listAllNotices(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM notices WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapNotice);
}

export async function findNoticeById(client, id) {
  const result = await client.query(`SELECT * FROM notices WHERE id = $1 LIMIT 1`, [id]);
  return mapNotice(result.rows[0]);
}

export async function insertNotice(client, { id, tenantId, type, title, body, audience, isPublished, createdBy }) {
  await client.query(
    `INSERT INTO notices (id, tenant_id, type, title, body, audience, is_published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, tenantId, type, title, body, audience, isPublished, createdBy || null],
  );
}

export async function updateNotice(client, { id, type, title, body, audience, isPublished }) {
  await client.query(
    `UPDATE notices
     SET type = $2, title = $3, body = $4, audience = $5, is_published = $6, updated_at = NOW()
     WHERE id = $1`,
    [id, type, title, body, audience, isPublished],
  );
}

export async function deleteNotice(client, id) {
  await client.query(`DELETE FROM notices WHERE id = $1`, [id]);
}
