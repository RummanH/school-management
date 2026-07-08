import { assert } from "../lib/errors.js";
import { createId as cryptoId } from "../lib/ids.js";
import {
  listClasses, listClassesPublic, findClassById, insertClass, updateClass, deleteClass,
  listRoutineByClass, upsertRoutineEntry, deleteRoutineEntry,
  listSyllabusByClass, insertSyllabusEntry, updateSyllabusEntry, deleteSyllabusEntry,
  listExamsByClass, findExamById, insertExam, updateExam, deleteExam,
  listStudentsByClass, listResultsByExam, listResultsByStudent, upsertResult,
  listAttendanceByClassDate, upsertAttendance, sendAbsenceGuardianAlerts, getAttendanceSummary,
  listAttendanceCorrections, createAttendanceCorrection, reviewAttendanceCorrection, getMonthlyAttendanceReport,
  listTeachersByTenant,
  listAcademicStructure, createAcademicSession, createAcademicTerm, createSubject, createTeacherSubjectAssignment, createGradingPolicy, createStudentMovement,
} from "../repositories/academicRepository.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function gradeFor(obtained, total) {
  if (obtained === null || obtained === undefined || !total) return '';
  const pct = (Number(obtained) / Number(total)) * 100;
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'A-';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
}

export class AcademicService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  async listClasses(tenantId) {
    return this.databaseManager.withClient(c => listClasses(c, tenantId));
  }

  // Public — for the admission form's "Applying for Class" dropdown
  async listClassesPublic() {
    return this.databaseManager.withClient(c => listClassesPublic(c));
  }

  async createClass(input, actor) {
    const name = (input.name || '').trim();
    assert(name, "Class name is required.", 400);
    const section     = (input.section || '').trim();
    const academicYear = (input.academicYear || '').trim();
    const classTeacherId = input.classTeacherId || null;
    const description = (input.description || '').trim();

    return this.databaseManager.withTransaction(async (c) => {
      await insertClass(c, { tenantId: actor.tenantId, name, section, academicYear, classTeacherId, description });
      return listClasses(c, actor.tenantId);
    });
  }

  async updateClass(classId, input, actor) {
    const name = (input.name || '').trim();
    assert(name, "Class name is required.", 400);
    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findClassById(c, classId);
      assert(existing && existing.tenant_id === actor.tenantId, "Class not found.", 404);
      await updateClass(c, {
        id: classId,
        name,
        section:         (input.section || '').trim(),
        academicYear:    (input.academicYear || '').trim(),
        classTeacherId:  input.classTeacherId || null,
        description:     (input.description || '').trim(),
      });
      return listClasses(c, actor.tenantId);
    });
  }

  async deleteClass(classId, actor) {
    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findClassById(c, classId);
      assert(existing && existing.tenant_id === actor.tenantId, "Class not found.", 404);
      await deleteClass(c, classId);
      return listClasses(c, actor.tenantId);
    });
  }

  // ── Routine ────────────────────────────────────────────────────────────────

  async getRoutine(classId, actor) {
    return this.databaseManager.withClient(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      return listRoutineByClass(c, classId);
    });
  }

  async saveRoutineEntry(classId, input, actor) {
    const subject = (input.subject || '').trim();
    assert(subject, "Subject is required.", 400);
    assert(DAYS.includes(input.dayOfWeek), "Invalid day.", 400);
    assert(Number.isInteger(Number(input.periodNumber)) && Number(input.periodNumber) >= 1, "Invalid period number.", 400);

    return this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      await upsertRoutineEntry(c, {
        tenantId: actor.tenantId, classId, dayOfWeek: input.dayOfWeek,
        periodNumber: Number(input.periodNumber), subject,
        teacherId: input.teacherId || null,
        startTime: (input.startTime || '').trim(),
        endTime:   (input.endTime   || '').trim(),
        room:      (input.room      || '').trim(),
      });
      return listRoutineByClass(c, classId);
    });
  }

  async deleteRoutineEntry(entryId, actor) {
    return this.databaseManager.withTransaction(async (c) => {
      await deleteRoutineEntry(c, entryId);
    });
  }

  // ── Syllabus ───────────────────────────────────────────────────────────────

  async getSyllabus(classId, actor) {
    return this.databaseManager.withClient(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      return listSyllabusByClass(c, classId);
    });
  }

  async createSyllabusEntry(classId, input, actor) {
    const subject = (input.subject || '').trim();
    const title   = (input.title   || '').trim();
    assert(subject, "Subject is required.", 400);
    assert(title, "Title is required.", 400);

    return this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      await insertSyllabusEntry(c, {
        tenantId: actor.tenantId, classId, subject, title,
        description:  (input.description  || '').trim(),
        chapterCount: Number(input.chapterCount || 0),
      });
      return listSyllabusByClass(c, classId);
    });
  }

  async updateSyllabusEntry(entryId, input, actor) {
    const subject = (input.subject || '').trim();
    const title   = (input.title   || '').trim();
    assert(subject, "Subject is required.", 400);
    assert(title, "Title is required.", 400);

    return this.databaseManager.withTransaction(async (c) => {
      await updateSyllabusEntry(c, {
        id: entryId, subject, title,
        description:  (input.description  || '').trim(),
        chapterCount: Number(input.chapterCount || 0),
      });
      return listSyllabusByClass(c, input.classId);
    });
  }

  async deleteSyllabusEntry(entryId, classId) {
    await this.databaseManager.withTransaction(c => deleteSyllabusEntry(c, entryId));
  }

  // ── Exam Schedules ─────────────────────────────────────────────────────────

  async getExams(classId, actor) {
    return this.databaseManager.withClient(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      return listExamsByClass(c, classId);
    });
  }

  async createExam(classId, input, actor) {
    const examName = (input.examName || '').trim();
    const subject  = (input.subject  || '').trim();
    const examDate = (input.examDate || '').trim();
    assert(examName, "Exam name is required.", 400);
    assert(subject,  "Subject is required.", 400);
    assert(examDate, "Exam date is required.", 400);

    return this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      await insertExam(c, {
        tenantId: actor.tenantId, classId, examName, subject, examDate,
        startTime:  (input.startTime  || '').trim(),
        endTime:    (input.endTime    || '').trim(),
        totalMarks: Number(input.totalMarks || 100),
        room:       (input.room       || '').trim(),
      });
      return listExamsByClass(c, classId);
    });
  }

  async updateExam(examId, input, actor) {
    const examName = (input.examName || '').trim();
    const subject  = (input.subject  || '').trim();
    const examDate = (input.examDate || '').trim();
    assert(examName, "Exam name is required.", 400);
    assert(subject,  "Subject is required.", 400);
    assert(examDate, "Exam date is required.", 400);

    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findExamById(c, examId);
      assert(existing && existing.tenant_id === actor.tenantId, "Exam not found.", 404);
      await updateExam(c, {
        id: examId, examName, subject, examDate,
        startTime:  (input.startTime  || '').trim(),
        endTime:    (input.endTime    || '').trim(),
        totalMarks: Number(input.totalMarks || 100),
        room:       (input.room       || '').trim(),
      });
      return listExamsByClass(c, existing.class_id);
    });
  }

  async deleteExam(examId, actor) {
    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findExamById(c, examId);
      assert(existing && existing.tenant_id === actor.tenantId, "Exam not found.", 404);
      await deleteExam(c, examId);
      return listExamsByClass(c, existing.class_id);
    });
  }

  // ── Exam Results ───────────────────────────────────────────────────────────

  async getResultsForExam(examScheduleId, actor) {
    return this.databaseManager.withClient(async (c) => {
      const exam = await findExamById(c, examScheduleId);
      assert(exam && exam.tenant_id === actor.tenantId, "Exam not found.", 404);
      const [students, existing] = await Promise.all([
        listStudentsByClass(c, exam.class_id),
        listResultsByExam(c, examScheduleId),
      ]);
      const resultMap = new Map(existing.map(r => [r.studentUserId, r]));
      return students.map(s => ({
        studentUserId: s.user_id,
        studentName:   s.name,
        rollNumber:    s.roll_number || '',
        marksObtained: resultMap.get(s.user_id)?.marksObtained ?? null,
        grade:         resultMap.get(s.user_id)?.grade ?? '',
        remarks:       resultMap.get(s.user_id)?.remarks ?? '',
      }));
    });
  }

  async saveResults(examScheduleId, entries, actor) {
    return this.databaseManager.withTransaction(async (c) => {
      const exam = await findExamById(c, examScheduleId);
      assert(exam && exam.tenant_id === actor.tenantId, "Exam not found.", 404);
      for (const entry of entries) {
        if (entry.marksObtained === null || entry.marksObtained === undefined) continue;
        const marks = Number(entry.marksObtained);
        assert(!Number.isNaN(marks) && marks >= 0 && marks <= exam.total_marks, `Invalid marks for student.`, 400);
        await upsertResult(c, {
          tenantId: actor.tenantId,
          examScheduleId,
          studentUserId: entry.studentUserId,
          marksObtained: marks,
          grade:   gradeFor(marks, exam.total_marks),
          remarks: entry.remarks || '',
        });
      }
    });
  }

  async getMyResults(studentUserId) {
    return this.databaseManager.withClient(c => listResultsByStudent(c, studentUserId));
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  async getAttendance(classId, date, actor, periodNumber = 0) {
    return this.databaseManager.withClient(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      return listAttendanceByClassDate(c, classId, date, Number(periodNumber || 0));
    });
  }

  async saveAttendance(classId, date, records, actor, periodNumber = 0) {
    const VALID = ['present', 'absent', 'late', 'excused'];
    let alertedCount = 0;
    await this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      for (const rec of records) {
        assert(VALID.includes(rec.status), "Invalid attendance status.", 400);
        await upsertAttendance(c, {
          tenantId: actor.tenantId,
          classId,
          studentUserId: rec.studentUserId,
          date,
          periodNumber: Number(rec.periodNumber ?? periodNumber ?? 0),
          status: rec.status,
          markedById: actor.id,
          note: rec.note || '',
          absenceReason: rec.absenceReason || '',
        });
      }
      alertedCount = await sendAbsenceGuardianAlerts(c, {
        tenantId: actor.tenantId,
        classId,
        date,
        periodNumber: Number(periodNumber || 0),
        senderUserId: actor.id,
      });
    });
    return { alertedCount };
  }

  async importAttendance(classId, date, input, actor) {
    const periodNumber = Number(input.periodNumber || 0);
    const lines = String(input.csv || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const currentRows = await this.getAttendance(classId, date, actor, periodNumber);
    const byRoll = new Map(currentRows.map(row => [String(row.rollNumber || '').trim(), row]));
    const byName = new Map(currentRows.map(row => [String(row.studentName || '').trim().toLowerCase(), row]));
    const records = [];
    for (const line of lines) {
      const [key, status = 'present', absenceReason = '', note = ''] = line.split(',').map(part => part.trim());
      const student = byRoll.get(key) || byName.get(key.toLowerCase());
      if (!student) continue;
      records.push({ studentUserId: student.studentUserId, status, absenceReason, note, periodNumber });
    }
    const result = await this.saveAttendance(classId, date, records, actor, periodNumber);
    return { importedCount: records.length, ...result };
  }

  async getAttendanceCorrections(actor, status = 'pending') {
    return this.databaseManager.withClient(c => listAttendanceCorrections(c, actor.tenantId, status));
  }

  async requestAttendanceCorrection(input, actor) {
    const status = (input.requestedStatus || '').trim();
    assert(['present', 'absent', 'late', 'excused'].includes(status), "Invalid attendance status.", 400);
    assert(input.classId && input.studentUserId && input.attendanceDate, "Class, student, and date are required.", 400);
    return this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, input.classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      await createAttendanceCorrection(c, {
        id: cryptoId('attcorr'),
        tenantId: actor.tenantId,
        attendanceId: input.attendanceId || null,
        classId: input.classId,
        studentUserId: input.studentUserId,
        attendanceDate: input.attendanceDate,
        periodNumber: Number(input.periodNumber || 0),
        requestedStatus: status,
        requestedReason: input.requestedReason || '',
        requestNote: input.requestNote || '',
        requestedBy: actor.id,
      });
      return listAttendanceCorrections(c, actor.tenantId, 'pending');
    });
  }

  async reviewAttendanceCorrection(id, input, actor) {
    const decision = input.decision === 'rejected' ? 'rejected' : 'approved';
    return this.databaseManager.withTransaction(async (c) => {
      const reviewed = await reviewAttendanceCorrection(c, actor.tenantId, id, decision, input.reviewNote || '', actor.id);
      assert(reviewed, "Correction request not found.", 404);
      return listAttendanceCorrections(c, actor.tenantId, 'pending');
    });
  }

  async getMonthlyAttendanceReport(classId, month, actor) {
    assert(/^\d{4}-\d{2}$/.test(month || ''), "Month must be YYYY-MM.", 400);
    return this.databaseManager.withClient(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      return getMonthlyAttendanceReport(c, actor.tenantId, classId, month);
    });
  }

  async getMyAttendanceSummary(studentUserId, classId) {
    return this.databaseManager.withClient(c => getAttendanceSummary(c, studentUserId, classId));
  }

  // ── Helpers for UI ─────────────────────────────────────────────────────────


  async getStructure(actor) {
    return this.databaseManager.withClient(c => listAcademicStructure(c, actor.tenantId));
  }

  async createStructureRecord(type, input, actor) {
    const requiredName = (input.name || '').trim();
    return this.databaseManager.withTransaction(async (c) => {
      if (type === 'sessions') {
        assert(requiredName, "Session name is required.", 400);
        await createAcademicSession(c, { ...input, id: cryptoId('session'), tenantId: actor.tenantId, name: requiredName });
      } else if (type === 'terms') {
        assert(requiredName, "Term name is required.", 400);
        await createAcademicTerm(c, { ...input, id: cryptoId('term'), tenantId: actor.tenantId, name: requiredName });
      } else if (type === 'subjects') {
        assert(requiredName, "Subject name is required.", 400);
        await createSubject(c, { ...input, id: cryptoId('subj'), tenantId: actor.tenantId, name: requiredName });
      } else if (type === 'assignments') {
        assert(input.teacherId && input.subjectId && input.classId, "Teacher, subject, and class are required.", 400);
        await createTeacherSubjectAssignment(c, { ...input, id: cryptoId('tsa'), tenantId: actor.tenantId });
      } else if (type === 'grading-policies') {
        assert(requiredName && input.grade, "Policy name and grade are required.", 400);
        await createGradingPolicy(c, { ...input, id: cryptoId('grade'), tenantId: actor.tenantId, name: requiredName });
      } else if (type === 'movements') {
        assert(input.studentUserId && input.movementType && input.effectiveDate, "Student, movement type, and date are required.", 400);
        await createStudentMovement(c, { ...input, id: cryptoId('move'), tenantId: actor.tenantId, createdBy: actor.id });
      } else {
        assert(false, "Unknown academic structure type.", 404);
      }
      return listAcademicStructure(c, actor.tenantId);
    });
  }
  async listTeachers(tenantId) {
    return this.databaseManager.withClient(c => listTeachersByTenant(c, tenantId));
  }
}
