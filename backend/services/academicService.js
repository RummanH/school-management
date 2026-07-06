import { assert } from "../lib/errors.js";
import {
  listClasses, listClassesPublic, findClassById, insertClass, updateClass, deleteClass,
  listRoutineByClass, upsertRoutineEntry, deleteRoutineEntry,
  listSyllabusByClass, insertSyllabusEntry, updateSyllabusEntry, deleteSyllabusEntry,
  listExamsByClass, findExamById, insertExam, updateExam, deleteExam,
  listStudentsByClass, listResultsByExam, listResultsByStudent, upsertResult,
  listAttendanceByClassDate, upsertAttendance, getAttendanceSummary,
  listTeachersByTenant,
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

  async getAttendance(classId, date, actor) {
    return this.databaseManager.withClient(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      return listAttendanceByClassDate(c, classId, date);
    });
  }

  async saveAttendance(classId, date, records, actor) {
    const VALID = ['present', 'absent', 'late', 'excused'];
    return this.databaseManager.withTransaction(async (c) => {
      const cls = await findClassById(c, classId);
      assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      for (const rec of records) {
        assert(VALID.includes(rec.status), "Invalid attendance status.", 400);
        await upsertAttendance(c, {
          tenantId: actor.tenantId, classId,
          studentUserId: rec.studentUserId,
          date, status: rec.status,
          markedById: actor.id,
          note: rec.note || '',
        });
      }
    });
  }

  async getMyAttendanceSummary(studentUserId, classId) {
    return this.databaseManager.withClient(c => getAttendanceSummary(c, studentUserId, classId));
  }

  // ── Helpers for UI ─────────────────────────────────────────────────────────

  async listTeachers(tenantId) {
    return this.databaseManager.withClient(c => listTeachersByTenant(c, tenantId));
  }
}
