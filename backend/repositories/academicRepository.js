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
    status:         row.status,
    note:           row.note,
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

export async function listAttendanceByClassDate(client, classId, date) {
  // Return all students in class + their attendance record for the date (NULL if not marked)
  const result = await client.query(
    `SELECT u.id AS student_user_id, u.name AS student_name, sp.roll_number,
            ar.id, ar.status, ar.note
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id AND u.status = 'active'
       LEFT JOIN attendance_records ar
         ON ar.student_user_id = sp.user_id AND ar.class_id = $1 AND ar.attendance_date = $2
      WHERE sp.class_id = $1
      ORDER BY sp.roll_number ASC, u.name ASC`,
    [classId, date],
  );
  return result.rows.map(r => ({
    studentUserId: r.student_user_id,
    studentName:   r.student_name,
    rollNumber:    r.roll_number || '',
    recordId:      r.id || null,
    status:        r.status || 'present',
    note:          r.note || '',
  }));
}

export async function upsertAttendance(client, { tenantId, classId, studentUserId, date, status, markedById, note }) {
  const id = createId('att');
  await client.query(
    `INSERT INTO attendance_records (id, tenant_id, class_id, student_user_id, attendance_date, status, marked_by_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (class_id, student_user_id, attendance_date) DO UPDATE
       SET status=$6, marked_by_id=$7, note=$8`,
    [id, tenantId, classId, studentUserId, date, status, markedById, note || ''],
  );
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
    absentCount:  Number(r.absent_count  || 0),
    lateCount:    Number(r.late_count    || 0),
    totalCount:   Number(r.total_count   || 0),
  };
}

export async function listTeachersByTenant(client, tenantId) {
  const result = await client.query(
    `SELECT u.id, u.name FROM users u WHERE u.tenant_id = $1 AND u.role = 'teacher' AND u.status = 'active' ORDER BY u.name ASC`,
    [tenantId],
  );
  return result.rows;
}
