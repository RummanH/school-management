export function mapWard(row) {
  return {
    userId:     row.user_id,
    name:       row.name,
    studentId:  row.student_id || null,
    className:  row.class_name || '',
    section:    row.section || '',
    rollNumber: row.roll_number || '',
    classId:    row.class_id || null,
  };
}

export async function listWardsForGuardian(client, guardianUserId) {
  const result = await client.query(
    `SELECT sp.user_id, sp.student_id, sp.class_name, sp.section, sp.roll_number, sp.class_id, u.name
       FROM guardian_students gs
       JOIN student_profiles sp ON sp.user_id = gs.student_user_id
       JOIN users u ON u.id = sp.user_id
      WHERE gs.guardian_user_id = $1
      ORDER BY u.name ASC`,
    [guardianUserId],
  );
  return result.rows.map(mapWard);
}

export async function listWardLinkIds(client, guardianUserId) {
  const result = await client.query(
    `SELECT student_user_id FROM guardian_students WHERE guardian_user_id = $1`,
    [guardianUserId],
  );
  return result.rows.map((r) => r.student_user_id);
}

export async function isWardOfGuardian(client, guardianUserId, studentUserId) {
  const result = await client.query(
    `SELECT 1 FROM guardian_students WHERE guardian_user_id = $1 AND student_user_id = $2 LIMIT 1`,
    [guardianUserId, studentUserId],
  );
  return result.rows.length > 0;
}

export async function linkGuardianStudent(client, { id, tenantId, guardianUserId, studentUserId }) {
  await client.query(
    `INSERT INTO guardian_students (id, tenant_id, guardian_user_id, student_user_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guardian_user_id, student_user_id) DO NOTHING`,
    [id, tenantId, guardianUserId, studentUserId],
  );
}

export async function unlinkGuardianStudent(client, guardianUserId, studentUserId) {
  await client.query(
    `DELETE FROM guardian_students WHERE guardian_user_id = $1 AND student_user_id = $2`,
    [guardianUserId, studentUserId],
  );
}
