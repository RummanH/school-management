export function mapTeacher(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    // user account fields (from JOIN)
    name: row.name,
    email: row.email,
    status: row.status,
    // profile fields
    employeeId: row.employee_id || null,
    designation: row.designation || '',
    photoUrl: row.photo_url || '',
    department: row.department || '',
    subjects: row.subjects || '',
    qualification: row.qualification || '',
    joiningDate: row.joining_date || null,
    dateOfBirth: row.date_of_birth || null,
    gender: row.gender || null,
    bloodGroup: row.blood_group || null,
    phone: row.phone || null,
    address: row.address || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTeachers(client, tenantId) {
  const result = await client.query(
    `SELECT tp.*, u.name, u.email, u.status
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.tenant_id = $1
     ORDER BY u.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapTeacher);
}

export async function findTeacherByUserId(client, userId) {
  const result = await client.query(
    `SELECT tp.*, u.name, u.email, u.status
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.user_id = $1 LIMIT 1`,
    [userId],
  );
  return mapTeacher(result.rows[0]);
}

export async function insertTeacherProfile(client, {
  id, tenantId, userId, employeeId, designation, photoUrl, department,
  subjects, qualification, joiningDate, dateOfBirth, gender,
  bloodGroup, phone, address,
}) {
  const result = await client.query(
    `INSERT INTO teacher_profiles
       (id, tenant_id, user_id, employee_id, designation, photo_url, department,
        subjects, qualification, joining_date, date_of_birth, gender,
        blood_group, phone, address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [id, tenantId, userId, employeeId || null, designation || '', photoUrl || null,
     department || '', subjects || '', qualification || '',
     joiningDate || null, dateOfBirth || null, gender || null,
     bloodGroup || null, phone || null, address || null],
  );
  return result.rows[0];
}

export async function updateTeacherProfile(client, {
  userId, employeeId, designation, photoUrl, department, subjects,
  qualification, joiningDate, dateOfBirth, gender, bloodGroup, phone, address,
}) {
  await client.query(
    `UPDATE teacher_profiles
     SET employee_id=$2, designation=$3, photo_url=$4, department=$5, subjects=$6,
         qualification=$7, joining_date=$8, date_of_birth=$9, gender=$10,
         blood_group=$11, phone=$12, address=$13, updated_at=NOW()
     WHERE user_id=$1`,
    [userId, employeeId || null, designation || '', photoUrl || null, department || '',
     subjects || '', qualification || '', joiningDate || null,
     dateOfBirth || null, gender || null, bloodGroup || null,
     phone || null, address || null],
  );
}


export async function listPublicTeachers(client, limit = 12) {
  const result = await client.query(
    `SELECT tp.*, u.name, u.email, u.status
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     JOIN tenants t ON t.id = tp.tenant_id
     WHERE u.status = 'active' AND t.status = 'active'
     ORDER BY NULLIF(tp.designation, '') NULLS LAST, u.name ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapTeacher);
}
