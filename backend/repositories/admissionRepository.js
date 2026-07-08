export function mapApplication(row) {
  if (!row) return null;
  return {
    id:                row.id,
    referenceCode:     row.reference_code,
    applicantName:     row.applicant_name,
    dateOfBirth:       row.date_of_birth,
    gender:            row.gender,
    applyingForClass:  row.applying_for_class,
    guardianName:      row.guardian_name,
    guardianPhone:     row.guardian_phone,
    guardianEmail:     row.guardian_email,
    previousSchool:    row.previous_school,
    photoData:         row.photo_data,
    status:            row.status,
    admissionTestDate: row.admission_test_date,
    notes:             row.notes,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

// List view deliberately excludes photo_data — keeps the admin list payload small.
export async function listApplications(client, status) {
  const result = await client.query(
    `SELECT id, reference_code, applicant_name, date_of_birth, gender, applying_for_class,
            guardian_name, guardian_phone, guardian_email, previous_school,
            status, admission_test_date, notes, created_at, updated_at
       FROM admission_applications
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY created_at DESC`,
    [status || null],
  );
  return result.rows.map(mapApplication);
}

export async function findApplicationById(client, id) {
  const result = await client.query(`SELECT * FROM admission_applications WHERE id = $1 LIMIT 1`, [id]);
  return mapApplication(result.rows[0]);
}

// Public status check — reference code alone is the shared secret (a
// six-character code from a 32-symbol alphabet, ~1 billion combinations,
// shared with the applicant once at submission time). Deliberately excludes
// photo_data and admin-only notes.
export async function findApplicationByReference(client, referenceCode) {
  const result = await client.query(
    `SELECT id, reference_code, applicant_name, applying_for_class, status, admission_test_date, created_at
       FROM admission_applications
      WHERE reference_code = $1
      LIMIT 1`,
    [referenceCode],
  );
  return mapApplication(result.rows[0]);
}

export async function referenceCodeExists(client, referenceCode) {
  const result = await client.query(
    `SELECT 1 FROM admission_applications WHERE reference_code = $1 LIMIT 1`,
    [referenceCode],
  );
  return result.rows.length > 0;
}

export async function insertApplication(client, {
  id, referenceCode, applicantName, dateOfBirth, gender, applyingForClass,
  guardianName, guardianPhone, guardianEmail, previousSchool, photoData,
}) {
  const result = await client.query(
    `INSERT INTO admission_applications
       (id, reference_code, applicant_name, date_of_birth, gender, applying_for_class,
        guardian_name, guardian_phone, guardian_email, previous_school, photo_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, reference_code, applicant_name, applying_for_class, status, created_at`,
    [id, referenceCode, applicantName, dateOfBirth || null, gender || null, applyingForClass || '',
     guardianName, guardianPhone, guardianEmail || null, previousSchool || null, photoData || null],
  );
  return mapApplication(result.rows[0]);
}

export async function updateApplicationStatus(client, { id, status, notes, admissionTestDate }) {
  const result = await client.query(
    `UPDATE admission_applications
        SET status = $2, notes = $3, admission_test_date = $4, updated_at = NOW()
      WHERE id = $1
      RETURNING id, reference_code, applicant_name, date_of_birth, gender, applying_for_class,
                guardian_name, guardian_phone, guardian_email, previous_school,
                status, admission_test_date, notes, created_at, updated_at`,
    [id, status, notes || '', admissionTestDate || null],
  );
  return mapApplication(result.rows[0]);
}

export function mapAdmissionDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    documentType: row.document_type,
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    storageKey: row.storage_key,
    verificationStatus: row.verification_status,
    verificationNotes: row.verification_notes || '',
    uploadedAt: row.uploaded_at,
    verifiedBy: row.verified_by || null,
    verifiedByName: row.verified_by_name || '',
    verifiedAt: row.verified_at || null,
  };
}

export async function listApplicationDocuments(client, applicationId) {
  const result = await client.query(
    `SELECT ad.*, u.name AS verified_by_name
       FROM admission_documents ad
       LEFT JOIN users u ON u.id = ad.verified_by
      WHERE ad.application_id = $1
      ORDER BY ad.uploaded_at ASC`,
    [applicationId],
  );
  return result.rows.map(mapAdmissionDocument);
}

export async function findApplicationDocument(client, id) {
  const result = await client.query(
    `SELECT ad.*, u.name AS verified_by_name
       FROM admission_documents ad
       LEFT JOIN users u ON u.id = ad.verified_by
      WHERE ad.id = $1
      LIMIT 1`,
    [id],
  );
  return mapAdmissionDocument(result.rows[0]);
}

export async function insertApplicationDocument(client, data) {
  const result = await client.query(
    `INSERT INTO admission_documents
       (id, application_id, document_type, original_name, mime_type, file_size, storage_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [data.id, data.applicationId, data.documentType, data.originalName, data.mimeType, data.fileSize, data.storageKey],
  );
  return mapAdmissionDocument(result.rows[0]);
}

export async function updateApplicationDocumentVerification(client, { id, verificationStatus, verificationNotes, verifiedBy }) {
  const result = await client.query(
    `UPDATE admission_documents
        SET verification_status = $2,
            verification_notes = $3,
            verified_by = $4,
            verified_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, verificationStatus, verificationNotes || '', verifiedBy],
  );
  return mapAdmissionDocument(result.rows[0]);
}