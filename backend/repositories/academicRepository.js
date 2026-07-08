import { createId } from "../lib/ids.js";

// ─── Row mappers ──────────────────────────────────────────────────────────────

export function mapClass(row) {
  return {
    id:              row.id,
    tenantId:        row.tenant_id,
    name:            row.name,
    section:         row.section,
    academicYear:    row.academic_year,
    classTeacherId:  row.class_teacher_id,
    classTeacherName:row.class_teacher_name || null,
    description:     row.description || '',
    studentCount:    Number(row.student_count || 0),
    createdAt:       row.created_at,
  };
}

export function mapRoutine(row) {
  return {
    id:           row.id,
    classId:      row.class_id,
    dayOfWeek:    row.day_of_week,
    periodNumber: row.period_number,
    subject:      row.subject,
    teacherId:    row.teacher_id,
    teacherName:  row.teacher_name || null,
    startTime:    row.start_time,
    endTime:      row.end_time,
    room:         row.room,
  };
}

export function mapSyllabus(row) {
  return {
    id:           row.id,
    classId:      row.class_id,
    subject:      row.subject,
    title:        row.title,
    description:  row.description,
    chapterCount: row.chapter_count,
    updatedAt:    row.updated_at,
  };
}

export function mapExam(row) {
  return {
    id:          row.id,
    classId:     row.class_id,
    examName:    row.exam_name,
    subject:     row.subject,
    examDate:    row.exam_date,
    startTime:   row.start_time,
    endTime:     row.end_time,
    totalMarks:  row.total_marks,
    room:        row.room,
    createdAt:   row.created_at,
  };
}

export function mapResult(row) {
  return {
    id:              row.id,
    examScheduleId:  row.exam_schedule_id,
    studentUserId:   row.student_user_id,
    studentName:     row.student_name || '',
    rollNumber:      row.roll_number  || '',
    marksObtained:   row.marks_obtained !== null ? Number(row.marks_obtained) : null,
    grade:           row.grade,
    remarks:         row.remarks,
  };
}

export function mapAttendance(row) {
  return {
    id:             row.id,
    studentUserId:  row.student_user_id,
    studentName:    row.student_name || '',
    rollNumber:     row.roll_number  || '',
    attendanceDate: row.attendance_date,
    periodNumber:   Number(row.period_number || 0),
    status:         row.status,
    note:           row.note,
    absenceReason:  row.absence_reason || '',
    guardianAlertSent: Boolean(row.guardian_alert_sent),
  };
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function listClasses(client, tenantId) {
  const result = await client.query(
    `SELECT c.*,
            u.name AS class_teacher_name,
            COUNT(sp.id) AS student_count
       FROM classes c
       LEFT JOIN users u ON u.id = c.class_teacher_id
       LEFT JOIN student_profiles sp ON sp.class_id = c.id
      WHERE c.tenant_id = $1
      GROUP BY c.id, u.name
      ORDER BY c.name ASC, c.section ASC`,
    [tenantId],
  );
  return result.rows.map(mapClass);
}

// Public (unauthenticated) — used by the online admission form's "Applying
// for Class" dropdown. No tenant filter: this deployment is single-school in
// practice (same simplification already used for notices/gallery/contact) —
// revisit if this becomes a shared multi-tenant public site.
export async function listClassesPublic(client) {
  const result = await client.query(
    `SELECT id, name, section, academic_year
       FROM classes
      ORDER BY name ASC, section ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    section: row.section || '',
    academicYear: row.academic_year || '',
  }));
}

export async function findClassById(client, id) {
  const result = await client.query('SELECT * FROM classes WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function insertClass(client, { tenantId, name, section, academicYear, classTeacherId, description }) {
  const id = createId('cls');
  await client.query(
    `INSERT INTO classes (id, tenant_id, name, section, academic_year, class_teacher_id, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, tenantId, name, section || '', academicYear || '', classTeacherId || null, description || ''],
  );
  return id;
}

export async function updateClass(client, { id, name, section, academicYear, classTeacherId, description }) {
  await client.query(
    `UPDATE classes SET name=$1, section=$2, academic_year=$3,
            class_teacher_id=$4, description=$5
      WHERE id = $6`,
    [name, section || '', academicYear || '', classTeacherId || null, description || '', id],
  );
}

export async function deleteClass(client, id) {
  await client.query('DELETE FROM classes WHERE id = $1', [id]);
}

// ─── Class Routine ────────────────────────────────────────────────────────────

export async function listRoutineByClass(client, classId) {
  const result = await client.query(
    `SELECT cr.*, u.name AS teacher_name
       FROM class_routines cr
       LEFT JOIN users u ON u.id = cr.teacher_id
      WHERE cr.class_id = $1
      ORDER BY
        CASE cr.day_of_week
          WHEN 'Sunday'    THEN 0 WHEN 'Monday' THEN 1
          WHEN 'Tuesday'   THEN 2 WHEN 'Wednesday' THEN 3
          WHEN 'Thursday'  THEN 4 WHEN 'Friday' THEN 5
          WHEN 'Saturday'  THEN 6 ELSE 7
        END,
        cr.period_number ASC`,
    [classId],
  );
  return result.rows.map(mapRoutine);
}

export async function upsertRoutineEntry(client, { tenantId, classId, dayOfWeek, periodNumber, subject, teacherId, startTime, endTime, room }) {
  const id = createId('rtn');
  await client.query(
    `INSERT INTO class_routines
       (id, tenant_id, class_id, day_of_week, period_number, subject, teacher_id, start_time, end_time, room)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (class_id, day_of_week, period_number) DO UPDATE
       SET subject=$6, teacher_id=$7, start_time=$8, end_time=$9, room=$10`,
    [id, tenantId, classId, dayOfWeek, periodNumber, subject, teacherId || null, startTime || '', endTime || '', room || ''],
  );
}

export async function deleteRoutineEntry(client, id) {
  await client.query('DELETE FROM class_routines WHERE id = $1', [id]);
}

// ─── Syllabus ─────────────────────────────────────────────────────────────────

export async function listSyllabusByClass(client, classId) {
  const result = await client.query(
    `SELECT * FROM syllabus_entries WHERE class_id = $1 ORDER BY subject ASC, title ASC`,
    [classId],
  );
  return result.rows.map(mapSyllabus);
}

export async function insertSyllabusEntry(client, { tenantId, classId, subject, title, description, chapterCount }) {
  const id = createId('syl');
  await client.query(
    `INSERT INTO syllabus_entries (id, tenant_id, class_id, subject, title, description, chapter_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, tenantId, classId, subject, title, description || '', chapterCount || 0],
  );
  return id;
}

export async function updateSyllabusEntry(client, { id, subject, title, description, chapterCount }) {
  await client.query(
    `UPDATE syllabus_entries SET subject=$1, title=$2, description=$3, chapter_count=$4, updated_at=NOW() WHERE id=$5`,
    [subject, title, description || '', chapterCount || 0, id],
  );
}

export async function deleteSyllabusEntry(client, id) {
  await client.query('DELETE FROM syllabus_entries WHERE id = $1', [id]);
}

// ─── Exam Schedules ───────────────────────────────────────────────────────────

export async function listExamsByClass(client, classId) {
  const result = await client.query(
    `SELECT * FROM exam_schedules WHERE class_id = $1 ORDER BY exam_date ASC, subject ASC`,
    [classId],
  );
  return result.rows.map(mapExam);
}

export async function findExamById(client, id) {
  const result = await client.query('SELECT * FROM exam_schedules WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function insertExam(client, { tenantId, classId, examName, subject, examDate, startTime, endTime, totalMarks, room }) {
  const id = createId('exm');
  await client.query(
    `INSERT INTO exam_schedules (id, tenant_id, class_id, exam_name, subject, exam_date, start_time, end_time, total_marks, room)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, tenantId, classId, examName, subject, examDate, startTime || '', endTime || '', totalMarks || 100, room || ''],
  );
  return id;
}

export async function updateExam(client, { id, examName, subject, examDate, startTime, endTime, totalMarks, room }) {
  await client.query(
    `UPDATE exam_schedules SET exam_name=$1, subject=$2, exam_date=$3, start_time=$4, end_time=$5, total_marks=$6, room=$7 WHERE id=$8`,
    [examName, subject, examDate, startTime || '', endTime || '', totalMarks || 100, room || '', id],
  );
}

export async function deleteExam(client, id) {
  await client.query('DELETE FROM exam_schedules WHERE id = $1', [id]);
}

// ─── Exam Results ─────────────────────────────────────────────────────────────

export async function listStudentsByClass(client, classId) {
  const result = await client.query(
    `SELECT u.id AS user_id, u.name, sp.roll_number
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
      WHERE sp.class_id = $1 AND u.status = 'active'
      ORDER BY sp.roll_number ASC, u.name ASC`,
    [classId],
  );
  return result.rows;
}

export async function listResultsByExam(client, examScheduleId) {
  const result = await client.query(
    `SELECT er.*, u.name AS student_name, sp.roll_number
       FROM exam_results er
       JOIN users u ON u.id = er.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = er.student_user_id
      WHERE er.exam_schedule_id = $1
      ORDER BY sp.roll_number ASC, u.name ASC`,
    [examScheduleId],
  );
  return result.rows.map(mapResult);
}

export async function listResultsByStudent(client, studentUserId) {
  const result = await client.query(
    `SELECT er.*, es.exam_name, es.subject, es.exam_date, es.total_marks, c.name AS class_name
       FROM exam_results er
       JOIN exam_schedules es ON es.id = er.exam_schedule_id
       JOIN classes c ON c.id = es.class_id
      WHERE er.student_user_id = $1
      ORDER BY es.exam_date DESC, es.subject ASC`,
    [studentUserId],
  );
  return result.rows.map(r => ({
    id:             r.id,
    examName:       r.exam_name,
    subject:        r.subject,
    examDate:       r.exam_date,
    totalMarks:     r.total_marks,
    className:      r.class_name,
    marksObtained:  r.marks_obtained !== null ? Number(r.marks_obtained) : null,
    grade:          r.grade,
    remarks:        r.remarks,
  }));
}

export async function upsertResult(client, { tenantId, examScheduleId, studentUserId, marksObtained, grade, remarks }) {
  const id = createId('res');
  await client.query(
    `INSERT INTO exam_results (id, tenant_id, exam_schedule_id, student_user_id, marks_obtained, grade, remarks)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (exam_schedule_id, student_user_id) DO UPDATE
       SET marks_obtained=$5, grade=$6, remarks=$7, updated_at=NOW()`,
    [id, tenantId, examScheduleId, studentUserId, marksObtained, grade || '', remarks || ''],
  );
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function listAttendanceByClassDate(client, classId, date, periodNumber = 0) {
  const result = await client.query(
    `SELECT u.id AS student_user_id, u.name AS student_name, sp.roll_number,
            ar.id, ar.status, ar.note, ar.period_number, ar.absence_reason, ar.guardian_alert_sent
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id AND u.status = 'active'
       LEFT JOIN attendance_records ar
         ON ar.student_user_id = sp.user_id
        AND ar.class_id = $1
        AND ar.attendance_date = $2
        AND ar.period_number = $3
      WHERE sp.class_id = $1
      ORDER BY CASE WHEN sp.roll_number ~ '^[0-9]+$' THEN sp.roll_number::int END NULLS LAST, sp.roll_number ASC, u.name ASC`,
    [classId, date, Number(periodNumber || 0)],
  );
  return result.rows.map(r => ({
    studentUserId: r.student_user_id,
    studentName: r.student_name,
    rollNumber: r.roll_number || '',
    recordId: r.id || null,
    attendanceDate: date,
    periodNumber: Number(r.period_number ?? periodNumber ?? 0),
    status: r.status || 'present',
    note: r.note || '',
    absenceReason: r.absence_reason || '',
    guardianAlertSent: Boolean(r.guardian_alert_sent),
  }));
}

export async function upsertAttendance(client, { tenantId, classId, studentUserId, date, periodNumber, status, markedById, note, absenceReason }) {
  const id = createId('att');
  const result = await client.query(
    `INSERT INTO attendance_records
       (id, tenant_id, class_id, student_user_id, attendance_date, period_number, status, marked_by_id, note, absence_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (class_id, student_user_id, attendance_date, period_number) DO UPDATE
       SET status=$7, marked_by_id=$8, note=$9, absence_reason=$10, updated_at=NOW()
     RETURNING *`,
    [id, tenantId, classId, studentUserId, date, Number(periodNumber || 0), status, markedById, note || '', absenceReason || ''],
  );
  return result.rows[0];
}

export async function sendAbsenceGuardianAlerts(client, { tenantId, classId, date, periodNumber, senderUserId }) {
  const absent = await client.query(
    `SELECT ar.id AS attendance_id, ar.student_user_id, ar.absence_reason, ar.guardian_alert_sent,
            su.name AS student_name, c.name AS class_name, c.section, gs.guardian_user_id
       FROM attendance_records ar
       JOIN users su ON su.id = ar.student_user_id
       JOIN classes c ON c.id = ar.class_id
       JOIN guardian_students gs ON gs.student_user_id = ar.student_user_id
       JOIN users gu ON gu.id = gs.guardian_user_id AND gu.status = 'active'
      WHERE ar.tenant_id = $1
        AND ar.class_id = $2
        AND ar.attendance_date = $3
        AND ar.period_number = $4
        AND ar.status = 'absent'
        AND ar.guardian_alert_sent = false`,
    [tenantId, classId, date, Number(periodNumber || 0)],
  );

  for (const row of absent.rows) {
    const threadId = createId('thread');
    const messageId = createId('msg');
    const periodLabel = Number(periodNumber || 0) > 0 ? `period ${periodNumber}` : 'daily attendance';
    const classLabel = `${row.class_name}${row.section ? ` - ${row.section}` : ''}`;
    const reason = row.absence_reason ? ` Reason: ${row.absence_reason}.` : '';
    await client.query(
      `INSERT INTO communication_threads
         (id, tenant_id, topic, student_user_id, guardian_user_id, admin_user_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6)`,
      [threadId, tenantId, `Absence alert - ${row.student_name}`, row.student_user_id, row.guardian_user_id, senderUserId],
    );
    await client.query(
      `INSERT INTO communication_messages
         (id, thread_id, tenant_id, sender_user_id, recipient_user_id, body)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [messageId, threadId, tenantId, senderUserId, row.guardian_user_id, `${row.student_name} was marked absent for ${classLabel} on ${date} (${periodLabel}).${reason}`],
    );
    await client.query(
      `UPDATE attendance_records SET guardian_alert_sent = true, guardian_alert_sent_at = NOW() WHERE id = $1`,
      [row.attendance_id],
    );
  }
  return absent.rows.length;
}

export async function getAttendanceSummary(client, studentUserId, classId) {
  const result = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'present') AS present_count,
       COUNT(*) FILTER (WHERE status = 'absent')  AS absent_count,
       COUNT(*) FILTER (WHERE status = 'late')    AS late_count,
       COUNT(*) AS total_count
     FROM attendance_records
    WHERE student_user_id = $1 AND class_id = $2`,
    [studentUserId, classId],
  );
  const r = result.rows[0] || {};
  return {
    presentCount: Number(r.present_count || 0),
    absentCount: Number(r.absent_count || 0),
    lateCount: Number(r.late_count || 0),
    totalCount: Number(r.total_count || 0),
  };
}

export async function listAttendanceCorrections(client, tenantId, status = 'pending') {
  const result = await client.query(
    `SELECT acr.*, su.name AS student_name, c.name AS class_name, c.section, rb.name AS requested_by_name, rv.name AS reviewed_by_name
       FROM attendance_correction_requests acr
       JOIN users su ON su.id = acr.student_user_id
       JOIN classes c ON c.id = acr.class_id
       LEFT JOIN users rb ON rb.id = acr.requested_by
       LEFT JOIN users rv ON rv.id = acr.reviewed_by
      WHERE acr.tenant_id = $1 AND ($2::text = 'all' OR acr.status = $2)
      ORDER BY acr.created_at DESC`,
    [tenantId, status || 'pending'],
  );
  return result.rows.map(r => ({
    id: r.id,
    attendanceId: r.attendance_id || null,
    classId: r.class_id,
    className: r.class_name,
    section: r.section || '',
    studentUserId: r.student_user_id,
    studentName: r.student_name,
    attendanceDate: r.attendance_date,
    periodNumber: Number(r.period_number || 0),
    requestedStatus: r.requested_status,
    requestedReason: r.requested_reason || '',
    requestNote: r.request_note || '',
    status: r.status,
    requestedByName: r.requested_by_name || '',
    reviewedByName: r.reviewed_by_name || '',
    reviewNote: r.review_note || '',
    createdAt: r.created_at,
  }));
}

export async function createAttendanceCorrection(client, data) {
  await client.query(
    `INSERT INTO attendance_correction_requests
       (id, tenant_id, attendance_id, class_id, student_user_id, attendance_date, period_number, requested_status, requested_reason, request_note, requested_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [data.id, data.tenantId, data.attendanceId || null, data.classId, data.studentUserId, data.attendanceDate,
     Number(data.periodNumber || 0), data.requestedStatus, data.requestedReason || '', data.requestNote || '', data.requestedBy],
  );
}

export async function reviewAttendanceCorrection(client, tenantId, id, decision, reviewNote, reviewerId) {
  const existing = await client.query(`SELECT * FROM attendance_correction_requests WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
  const request = existing.rows[0];
  if (!request) return null;
  await client.query(
    `UPDATE attendance_correction_requests
        SET status=$3, reviewed_by=$4, reviewed_at=NOW(), review_note=$5, updated_at=NOW()
      WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId, decision, reviewerId, reviewNote || ''],
  );
  if (decision === 'approved') {
    await upsertAttendance(client, {
      tenantId,
      classId: request.class_id,
      studentUserId: request.student_user_id,
      date: request.attendance_date,
      periodNumber: request.period_number,
      status: request.requested_status,
      markedById: reviewerId,
      note: request.request_note,
      absenceReason: request.requested_reason,
    });
  }
  return request;
}

export async function getMonthlyAttendanceReport(client, tenantId, classId, month) {
  const result = await client.query(
    `SELECT ar.student_user_id, u.name AS student_name, sp.roll_number,
            COUNT(*)::int AS total_count,
            COUNT(*) FILTER (WHERE ar.status = 'present')::int AS present_count,
            COUNT(*) FILTER (WHERE ar.status = 'absent')::int AS absent_count,
            COUNT(*) FILTER (WHERE ar.status = 'late')::int AS late_count,
            COUNT(*) FILTER (WHERE ar.status = 'excused')::int AS excused_count
       FROM attendance_records ar
       JOIN users u ON u.id = ar.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = ar.student_user_id
      WHERE ar.tenant_id = $1
        AND ar.class_id = $2
        AND ar.attendance_date >= $3 || '-01'
        AND ar.attendance_date < ((($3 || '-01')::date + INTERVAL '1 month')::date)::text
      GROUP BY ar.student_user_id, u.name, sp.roll_number
      ORDER BY CASE WHEN sp.roll_number ~ '^[0-9]+$' THEN sp.roll_number::int END NULLS LAST, sp.roll_number ASC, u.name ASC`,
    [tenantId, classId, month],
  );
  return result.rows.map(r => {
    const total = Number(r.total_count || 0);
    const present = Number(r.present_count || 0);
    return {
      studentUserId: r.student_user_id,
      studentName: r.student_name,
      rollNumber: r.roll_number || '',
      totalCount: total,
      presentCount: present,
      absentCount: Number(r.absent_count || 0),
      lateCount: Number(r.late_count || 0),
      excusedCount: Number(r.excused_count || 0),
      attendancePercentage: total ? Math.round((present / total) * 10000) / 100 : 0,
    };
  });
}

export async function listTeachersByTenant(client, tenantId) {
  const result = await client.query(
    `SELECT u.id, u.name FROM users u WHERE u.tenant_id = $1 AND u.role = 'teacher' AND u.status = 'active' ORDER BY u.name ASC`,
    [tenantId],
  );
  return result.rows;
}

// Academic structure master data
export const mapSimple = (row) => ({ ...row });

export async function listAcademicStructure(client, tenantId) {
  const sessions = await client.query(`SELECT * FROM academic_sessions WHERE tenant_id=$1 ORDER BY is_active DESC, start_date DESC, name ASC`, [tenantId]);
  const terms = await client.query(`SELECT t.*, s.name AS session_name FROM academic_terms t LEFT JOIN academic_sessions s ON s.id=t.session_id WHERE t.tenant_id=$1 ORDER BY s.start_date DESC, t.sort_order ASC`, [tenantId]);
  const subjects = await client.query(`SELECT * FROM subjects WHERE tenant_id=$1 ORDER BY is_active DESC, name ASC`, [tenantId]);
  const assignments = await client.query(`SELECT a.*, u.name AS teacher_name, sub.name AS subject_name, c.name AS class_name, c.section, s.name AS session_name FROM teacher_subject_assignments a JOIN users u ON u.id=a.teacher_id JOIN subjects sub ON sub.id=a.subject_id JOIN classes c ON c.id=a.class_id LEFT JOIN academic_sessions s ON s.id=a.session_id WHERE a.tenant_id=$1 ORDER BY c.name, sub.name, u.name`, [tenantId]);
  const gradingPolicies = await client.query(`SELECT * FROM grading_policies WHERE tenant_id=$1 ORDER BY max_percent DESC, min_percent DESC`, [tenantId]);
  const movements = await client.query(`SELECT m.*, u.name AS student_name, fc.name AS from_class_name, tc.name AS to_class_name, fs.name AS from_session_name, ts.name AS to_session_name FROM student_academic_movements m JOIN users u ON u.id=m.student_user_id LEFT JOIN classes fc ON fc.id=m.from_class_id LEFT JOIN classes tc ON tc.id=m.to_class_id LEFT JOIN academic_sessions fs ON fs.id=m.from_session_id LEFT JOIN academic_sessions ts ON ts.id=m.to_session_id WHERE m.tenant_id=$1 ORDER BY m.created_at DESC`, [tenantId]);
  return { sessions: sessions.rows, terms: terms.rows, subjects: subjects.rows, assignments: assignments.rows, gradingPolicies: gradingPolicies.rows, movements: movements.rows };
}

export async function createAcademicSession(client, data) {
  await client.query(`INSERT INTO academic_sessions (id,tenant_id,name,start_date,end_date,is_active) VALUES ($1,$2,$3,$4,$5,$6)`, [data.id,data.tenantId,data.name,data.startDate||null,data.endDate||null,Boolean(data.isActive)]);
}
export async function createAcademicTerm(client, data) {
  await client.query(`INSERT INTO academic_terms (id,tenant_id,session_id,name,start_date,end_date,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [data.id,data.tenantId,data.sessionId||null,data.name,data.startDate||null,data.endDate||null,Number(data.sortOrder||0)]);
}
export async function createSubject(client, data) {
  await client.query(`INSERT INTO subjects (id,tenant_id,code,name,department,description,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [data.id,data.tenantId,data.code||'',data.name,data.department||'',data.description||'',data.isActive!==false]);
}
export async function createTeacherSubjectAssignment(client, data) {
  await client.query(`INSERT INTO teacher_subject_assignments (id,tenant_id,teacher_id,subject_id,class_id,session_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (teacher_id, subject_id, class_id, session_id) DO NOTHING`, [data.id,data.tenantId,data.teacherId,data.subjectId,data.classId,data.sessionId||null]);
}
export async function createGradingPolicy(client, data) {
  await client.query(`INSERT INTO grading_policies (id,tenant_id,name,min_percent,max_percent,grade,grade_point,is_passing) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [data.id,data.tenantId,data.name,Number(data.minPercent||0),Number(data.maxPercent||100),data.grade,Number(data.gradePoint||0),data.isPassing!==false]);
}
export async function createStudentMovement(client, data) {
  await client.query(`INSERT INTO student_academic_movements (id,tenant_id,student_user_id,movement_type,from_class_id,to_class_id,from_section,to_section,from_session_id,to_session_id,effective_date,reason,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [data.id,data.tenantId,data.studentUserId,data.movementType,data.fromClassId||null,data.toClassId||null,data.fromSection||'',data.toSection||'',data.fromSessionId||null,data.toSessionId||null,data.effectiveDate,data.reason||'',data.createdBy]);
  if (['promotion','section_change'].includes(data.movementType) && data.toClassId) {
    const cls = await client.query(`SELECT name, section FROM classes WHERE id=$1`, [data.toClassId]);
    await client.query(`UPDATE student_profiles SET class_id=$2, class_name=$3, section=$4, updated_at=NOW() WHERE user_id=$1`, [data.studentUserId,data.toClassId,cls.rows[0]?.name||'',data.toSection || cls.rows[0]?.section || '']);
  }
  if (['withdrawal','transfer'].includes(data.movementType)) {
    await client.query(`UPDATE users SET status='inactive', updated_at=NOW() WHERE id=$1`, [data.studentUserId]);
  }
}
