export function mapStudent(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    classId: row.class_id || null,
    // user account fields (from JOIN)
    name: row.name,
    email: row.email,
    status: row.status,
    // profile fields
    studentId: row.student_id || null,
    className: row.class_name || '',
    section: row.section || '',
    rollNumber: row.roll_number || '',
    admissionDate: row.admission_date || null,
    dateOfBirth: row.date_of_birth || null,
    gender: row.gender || null,
    bloodGroup: row.blood_group || null,
    phone: row.phone || null,
    address: row.address || null,
    guardianName: row.guardian_name || null,
    guardianPhone: row.guardian_phone || null,
    guardianRelation: row.guardian_relation || null,
    photoUrl: row.photo_url || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listStudents(client, tenantId) {
  const result = await client.query(
    `SELECT sp.*, u.name, u.email, u.status
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.tenant_id = $1
     ORDER BY sp.class_name ASC, sp.section ASC, sp.roll_number ASC, u.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapStudent);
}

export async function findStudentByUserId(client, userId) {
  const result = await client.query(
    `SELECT sp.*, u.name, u.email, u.status
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1 LIMIT 1`,
    [userId],
  );
  return mapStudent(result.rows[0]);
}

export async function insertStudentProfile(client, {
  id, tenantId, userId, classId, studentId, className, section, rollNumber,
  admissionDate, dateOfBirth, gender, bloodGroup, phone, address,
  guardianName, guardianPhone, guardianRelation, photoUrl,
}) {
  const result = await client.query(
    `INSERT INTO student_profiles
       (id, tenant_id, user_id, class_id, student_id, class_name, section, roll_number,
        admission_date, date_of_birth, gender, blood_group, phone, address,
        guardian_name, guardian_phone, guardian_relation, photo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [id, tenantId, userId, classId || null, studentId || null, className || '', section || '',
     rollNumber || '', admissionDate || null, dateOfBirth || null,
     gender || null, bloodGroup || null, phone || null, address || null,
     guardianName || null, guardianPhone || null, guardianRelation || null, photoUrl || null],
  );
  return result.rows[0];
}

export async function updateStudentProfile(client, {
  userId, classId, studentId, className, section, rollNumber,
  admissionDate, dateOfBirth, gender, bloodGroup, phone, address,
  guardianName, guardianPhone, guardianRelation, photoUrl,
}) {
  await client.query(
    `UPDATE student_profiles
     SET class_id=$2, student_id=$3, class_name=$4, section=$5, roll_number=$6,
         admission_date=$7, date_of_birth=$8, gender=$9, blood_group=$10,
         phone=$11, address=$12, guardian_name=$13, guardian_phone=$14,
         guardian_relation=$15, photo_url=$16, updated_at=NOW()
     WHERE user_id=$1`,
    [userId, classId || null, studentId || null, className || '', section || '',
     rollNumber || '', admissionDate || null, dateOfBirth || null,
     gender || null, bloodGroup || null, phone || null, address || null,
     guardianName || null, guardianPhone || null, guardianRelation || null, photoUrl || null],
  );
}
