import { createId } from "../lib/ids.js";

export async function insertIssuance(client, data) {
  const result = await client.query(
    `INSERT INTO document_issuances (id, tenant_id, student_user_id, document_type, verify_code, issued_by, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
     RETURNING *`,
    [createId('docissue'), data.tenantId, data.studentUserId, data.documentType, data.verifyCode,
     data.issuedBy || null, JSON.stringify(data.metadata || {})],
  );
  return mapIssuance(result.rows[0]);
}

export async function findIssuanceByCode(client, verifyCode) {
  const result = await client.query(
    `SELECT di.*, u.name AS student_name, sp.class_name, sp.section, t.name AS tenant_name
       FROM document_issuances di
       JOIN users u ON u.id = di.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = di.student_user_id
       JOIN tenants t ON t.id = di.tenant_id
      WHERE di.verify_code = $1
      LIMIT 1`,
    [verifyCode],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...mapIssuance(row),
    studentName: row.student_name,
    className: row.class_name || '',
    section: row.section || '',
    tenantName: row.tenant_name,
  };
}

function mapIssuance(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentUserId: row.student_user_id,
    documentType: row.document_type,
    verifyCode: row.verify_code,
    issuedBy: row.issued_by,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}
