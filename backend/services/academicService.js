import { assert } from "../lib/errors.js";
import { createId as cryptoId } from "../lib/ids.js";
import {
  listClasses, listClassesPublic, findClassById, insertClass, updateClass, deleteClass,
  listRoutineByClass, upsertRoutineEntry, deleteRoutineEntry,
  listSyllabusByClass, insertSyllabusEntry, updateSyllabusEntry, deleteSyllabusEntry,
  listExamsByClass, findExamById, insertExam, updateExam, deleteExam,
  listExamGroups, findExamGroupById, insertExamGroup, updateExamGroup, deleteExamGroup,
  listStudentsByClass, listResultsByExam, listResultsByStudent, upsertResult,
  listAttendanceByClassDate, upsertAttendance, sendAbsenceGuardianAlerts, getAttendanceSummary,
  listAttendanceCorrections, createAttendanceCorrection, reviewAttendanceCorrection, getMonthlyAttendanceReport,
  listTeachersByTenant,
  listAcademicStructure, createAcademicSession, createAcademicTerm, createSubject, createTeacherSubjectAssignment, createGradingPolicy, createStudentMovement,
  updateAcademicSession, deactivateOtherSessions, findSessionById, updateAcademicTerm, updateSubject, updateGradingPolicy, deleteStructureRecord,
  getGradingPolicies,
} from "../repositories/academicRepository.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Grade from the tenant's own grading policies; the built-in ladder is only a
// fallback for tenants that haven't defined any bands yet.
function gradeFor(obtained, total, policies = []) {
  if (obtained === null || obtained === undefined || !total) return '';
  const pct = (Number(obtained) / Number(total)) * 100;
  const band = policies.find(p => pct >= Number(p.min_percent) && pct <= Number(p.max_percent));
  if (band) return band.grade;
  if (policies.length) return policies[policies.length - 1].grade; // below every band → lowest defined grade
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

  // The class's academic_year display string mirrors the linked session's name
  // (kept in sync here so reports/cards/admission labels keep working); a
  // free-text academicYear is only honored when no session is linked.
  async resolveSessionYear(c, sessionId, actor, fallbackYear = '') {
    if (!sessionId) return { sessionId: null, academicYear: (fallbackYear || '').trim() };
    const session = await findSessionById(c, sessionId);
    assert(session && session.tenant_id === actor.tenantId, "Session not found.", 404);
    return { sessionId: session.id, academicYear: session.name };
  }

  async createClass(input, actor) {
    const name = (input.name || '').trim();
    assert(name, "Class name is required.", 400);
    return this.databaseManager.withTransaction(async (c) => {
      const { sessionId, academicYear } = await this.resolveSessionYear(c, input.sessionId, actor, input.academicYear);
      await insertClass(c, {
        tenantId: actor.tenantId, name,
        section: (input.section || '').trim(),
        academicYear, sessionId,
        classTeacherId: input.classTeacherId || null,
        description: (input.description || '').trim(),
      });
      return listClasses(c, actor.tenantId);
    });
  }

  async updateClass(classId, input, actor) {
    const name = (input.name || '').trim();
    assert(name, "Class name is required.", 400);
    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findClassById(c, classId);
      assert(existing && existing.tenant_id === actor.tenantId, "Class not found.", 404);
      const { sessionId, academicYear } = await this.resolveSessionYear(c, input.sessionId, actor, input.academicYear);
      await updateClass(c, {
        id: classId,
        name,
        section:         (input.section || '').trim(),
        academicYear, sessionId,
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

  // ── Exams (first-class records: name/term/session) ────────────────────────

  async listExamGroups(actor, sessionId = null) {
    return this.databaseManager.withClient(c => listExamGroups(c, actor.tenantId, sessionId || null));
  }

  async createExamGroup(input, actor) {
    const name = (input.name || '').trim();
    assert(name, "Exam name is required.", 400);
    return this.databaseManager.withTransaction(async (c) => {
      await insertExamGroup(c, {
        id: cryptoId('exam'),
        tenantId: actor.tenantId,
        name,
        sessionId: input.sessionId || null,
        termId: input.termId || null,
        status: input.status || 'scheduled',
      });
      return listExamGroups(c, actor.tenantId, null);
    });
  }

  async updateExamGroup(id, input, actor) {
    const name = (input.name || '').trim();
    assert(name, "Exam name is required.", 400);
    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findExamGroupById(c, id);
      assert(existing && existing.tenant_id === actor.tenantId, "Exam not found.", 404);
      await updateExamGroup(c, {
        id, name,
        sessionId: input.sessionId ?? existing.session_id,
        termId: input.termId ?? existing.term_id,
        status: input.status || existing.status,
      });
      return listExamGroups(c, actor.tenantId, null);
    });
  }

  async deleteExamGroup(id, actor) {
    return this.databaseManager.withTransaction(async (c) => {
      const existing = await findExamGroupById(c, id);
      assert(existing && existing.tenant_id === actor.tenantId, "Exam not found.", 404);
      await deleteExamGroup(c, id);
      return listExamGroups(c, actor.tenantId, null);
    });
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
    const subject  = (input.subject  || '').trim();
    const examDate = (input.examDate || '').trim();
    assert(subject,  "Subject is required.", 400);
    assert(examDate, "Exam date is required.", 400);

    return this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);

      // Schedule rows belong to an exam record; exam_name mirrors its name.
      // Free-text examName without examId is still accepted as a legacy path.
      let examId = input.examId || null;
      let examName = (input.examName || '').trim();
      if (examId) {
        const group = await findExamGroupById(c, examId);
        assert(group && group.tenant_id === actor.tenantId, "Exam not found.", 404);
        examName = group.name;
      }
      assert(examName, "Exam name is required.", 400);

      await insertExam(c, {
        tenantId: actor.tenantId, classId, examId, examName, subject, examDate,
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
      const policies = await getGradingPolicies(c, actor.tenantId);
      for (const entry of entries) {
        if (entry.marksObtained === null || entry.marksObtained === undefined) continue;
        const marks = Number(entry.marksObtained);
        assert(!Number.isNaN(marks) && marks >= 0 && marks <= exam.total_marks, `Invalid marks for student.`, 400);
        await upsertResult(c, {
          tenantId: actor.tenantId,
          examScheduleId,
          studentUserId: entry.studentUserId,
          marksObtained: marks,
          grade:   gradeFor(marks, exam.total_marks, policies),
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
        const id = cryptoId('session');
        await createAcademicSession(c, { ...input, id, tenantId: actor.tenantId, name: requiredName });
        if (input.isActive) await deactivateOtherSessions(c, actor.tenantId, id);
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

  async updateStructureRecord(type, id, input, actor) {
    const requiredName = (input.name || '').trim();
    return this.databaseManager.withTransaction(async (c) => {
      if (type === 'sessions') {
        assert(requiredName, "Session name is required.", 400);
        await updateAcademicSession(c, actor.tenantId, id, { ...input, name: requiredName });
        if (input.isActive) await deactivateOtherSessions(c, actor.tenantId, id);
      } else if (type === 'terms') {
        assert(requiredName, "Term name is required.", 400);
        await updateAcademicTerm(c, actor.tenantId, id, { ...input, name: requiredName });
      } else if (type === 'subjects') {
        assert(requiredName, "Subject name is required.", 400);
        await updateSubject(c, actor.tenantId, id, { ...input, name: requiredName });
      } else if (type === 'grading-policies') {
        assert(requiredName && input.grade, "Policy name and grade are required.", 400);
        await updateGradingPolicy(c, actor.tenantId, id, { ...input, name: requiredName });
      } else {
        assert(false, "This structure type cannot be edited.", 400);
      }
      return listAcademicStructure(c, actor.tenantId);
    });
  }

  async deleteStructureRecord(type, id, actor) {
    return this.databaseManager.withTransaction(async (c) => {
      const removed = await deleteStructureRecord(c, actor.tenantId, type, id);
      assert(removed, "Record not found or cannot be deleted.", 404);
      return listAcademicStructure(c, actor.tenantId);
    });
  }

  // Year-end helper: promote every active student of a class in one action.
  // Reuses the per-student movement (audit log + profile update) so each
  // student still gets an individual movement record.
  async bulkPromote(input, actor) {
    const { fromClassId, toClassId } = input;
    assert(fromClassId && toClassId, "Both source and destination class are required.", 400);
    assert(fromClassId !== toClassId, "Source and destination class must differ.", 400);
    const effectiveDate = (input.effectiveDate || '').trim() || new Date().toISOString().slice(0, 10);

    return this.databaseManager.withTransaction(async (c) => {
      const fromCls = await findClassById(c, fromClassId);
      const toCls = await findClassById(c, toClassId);
      assert(fromCls && fromCls.tenant_id === actor.tenantId, "Source class not found.", 404);
      assert(toCls && toCls.tenant_id === actor.tenantId, "Destination class not found.", 404);

      const students = await listStudentsByClass(c, fromClassId);
      for (const student of students) {
        await createStudentMovement(c, {
          id: cryptoId('move'),
          tenantId: actor.tenantId,
          studentUserId: student.user_id,
          movementType: 'promotion',
          fromClassId,
          toClassId,
          fromSection: fromCls.section || '',
          toSection: input.toSection || toCls.section || '',
          fromSessionId: fromCls.session_id || null,
          toSessionId: toCls.session_id || input.toSessionId || null,
          effectiveDate,
          reason: input.reason || `Bulk promotion from ${fromCls.name}`,
          createdBy: actor.id,
        });
      }
      return { promotedCount: students.length };
    });
  }

  async listTeachers(tenantId) {
    return this.databaseManager.withClient(c => listTeachersByTenant(c, tenantId));
  }
}
