export function mapNotice(row) {
  if (!row) return null;
  return {
    id:          row.id,
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

export async function listPublicNotices(client, type, limit) {
  const result = await client.query(
    `SELECT * FROM notices
      WHERE type = $1 AND audience = 'public' AND is_published = true
      ORDER BY published_at DESC
      LIMIT $2`,
    [type, limit],
  );
  return result.rows.map(mapNotice);
}

export async function listForAudience(client, role) {
  const result = await client.query(
    `SELECT * FROM notices
      WHERE is_published = true AND audience IN ('all_portal', 'public', $1)
      ORDER BY published_at DESC`,
    [role],
  );
  return result.rows.map(mapNotice);
}

export async function listAllNotices(client) {
  const result = await client.query(`SELECT * FROM notices ORDER BY created_at DESC`);
  return result.rows.map(mapNotice);
}

export async function findNoticeById(client, id) {
  const result = await client.query(`SELECT * FROM notices WHERE id = $1 LIMIT 1`, [id]);
  return mapNotice(result.rows[0]);
}

export async function insertNotice(client, { id, type, title, body, audience, isPublished, createdBy }) {
  await client.query(
    `INSERT INTO notices (id, type, title, body, audience, is_published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, type, title, body, audience, isPublished, createdBy || null],
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
