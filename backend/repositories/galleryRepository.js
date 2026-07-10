export function mapGalleryItem(row) {
  if (!row) return null;
  return {
    id:        row.id,
    tenantId:  row.tenant_id,
    type:      row.type,
    url:       row.url,
    caption:   row.caption,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listPublicGalleryItems(client) {
  const result = await client.query(
    `SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at ASC`,
  );
  return result.rows.map(mapGalleryItem);
}

export async function listGalleryItems(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM gallery_items WHERE tenant_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [tenantId],
  );
  return result.rows.map(mapGalleryItem);
}

export async function findGalleryItemById(client, id) {
  const result = await client.query(`SELECT * FROM gallery_items WHERE id = $1 LIMIT 1`, [id]);
  return mapGalleryItem(result.rows[0]);
}

export async function insertGalleryItem(client, { id, tenantId, type, url, caption, sortOrder }) {
  await client.query(
    `INSERT INTO gallery_items (id, tenant_id, type, url, caption, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, tenantId, type, url, caption, sortOrder],
  );
}

export async function updateGalleryItem(client, { id, type, url, caption, sortOrder }) {
  await client.query(
    `UPDATE gallery_items
     SET type = $2, url = $3, caption = $4, sort_order = $5
     WHERE id = $1`,
    [id, type, url, caption, sortOrder],
  );
}

export async function deleteGalleryItem(client, id) {
  await client.query(`DELETE FROM gallery_items WHERE id = $1`, [id]);
}
