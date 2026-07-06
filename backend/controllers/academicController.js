export class AcademicController {
  constructor(academicService) {
    this.academicService = academicService;
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  listClasses = async (req, res, next) => {
    try {
      const classes = await this.academicService.listClasses(req.currentUser.tenantId);
      res.json({ classes });
    } catch (err) { next(err); }
  };

  listClassesPublic = async (req, res, next) => {
    try {
      const classes = await this.academicService.listClassesPublic();
      res.json({ classes });
    } catch (err) { next(err); }
  };

  createClass = async (req, res, next) => {
    try {
      const classes = await this.academicService.createClass(req.body, req.currentUser);
      res.status(201).json({ classes });
    } catch (err) { next(err); }
  };

  updateClass = async (req, res, next) => {
    try {
      const classes = await this.academicService.updateClass(req.params.id, req.body, req.currentUser);
      res.json({ classes });
    } catch (err) { next(err); }
  };

  deleteClass = async (req, res, next) => {
    try {
      const classes = await this.academicService.deleteClass(req.params.id, req.currentUser);
      res.json({ classes });
    } catch (err) { next(err); }
  };

  // ── Routine ────────────────────────────────────────────────────────────────

  getRoutine = async (req, res, next) => {
    try {
      const routine = await this.academicService.getRoutine(req.params.classId, req.currentUser);
      res.json({ routine });
    } catch (err) { next(err); }
  };

  saveRoutineEntry = async (req, res, next) => {
    try {
      const routine = await this.academicService.saveRoutineEntry(req.params.classId, req.body, req.currentUser);
      res.json({ routine });
    } catch (err) { next(err); }
  };

  deleteRoutineEntry = async (req, res, next) => {
    try {
      await this.academicService.deleteRoutineEntry(req.params.entryId, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  // ── Syllabus ───────────────────────────────────────────────────────────────

  getSyllabus = async (req, res, next) => {
    try {
      const syllabus = await this.academicService.getSyllabus(req.params.classId, req.currentUser);
      res.json({ syllabus });
    } catch (err) { next(err); }
  };

  createSyllabusEntry = async (req, res, next) => {
    try {
      const syllabus = await this.academicService.createSyllabusEntry(req.params.classId, req.body, req.currentUser);
      res.status(201).json({ syllabus });
    } catch (err) { next(err); }
  };

  updateSyllabusEntry = async (req, res, next) => {
    try {
      const syllabus = await this.academicService.updateSyllabusEntry(req.params.entryId, req.body, req.currentUser);
      res.json({ syllabus });
    } catch (err) { next(err); }
  };

  deleteSyllabusEntry = async (req, res, next) => {
    try {
      await this.academicService.deleteSyllabusEntry(req.params.entryId, req.body.classId);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  // ── Exam Schedules ─────────────────────────────────────────────────────────

  getExams = async (req, res, next) => {
    try {
      const exams = await this.academicService.getExams(req.params.classId, req.currentUser);
      res.json({ exams });
    } catch (err) { next(err); }
  };

  createExam = async (req, res, next) => {
    try {
      const exams = await this.academicService.createExam(req.params.classId, req.body, req.currentUser);
      res.status(201).json({ exams });
    } catch (err) { next(err); }
  };

  updateExam = async (req, res, next) => {
    try {
      const exams = await this.academicService.updateExam(req.params.examId, req.body, req.currentUser);
      res.json({ exams });
    } catch (err) { next(err); }
  };

  deleteExam = async (req, res, next) => {
    try {
      const exams = await this.academicService.deleteExam(req.params.examId, req.currentUser);
      res.json({ exams });
    } catch (err) { next(err); }
  };

  // ── Exam Results ───────────────────────────────────────────────────────────

  getResults = async (req, res, next) => {
    try {
      const results = await this.academicService.getResultsForExam(req.params.examId, req.currentUser);
      res.json({ results });
    } catch (err) { next(err); }
  };

  saveResults = async (req, res, next) => {
    try {
      await this.academicService.saveResults(req.params.examId, req.body.entries || [], req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  getMyResults = async (req, res, next) => {
    try {
      const results = await this.academicService.getMyResults(req.currentUser.id);
      res.json({ results });
    } catch (err) { next(err); }
  };

  // ── Attendance ─────────────────────────────────────────────────────────────

  getAttendance = async (req, res, next) => {
    try {
      const { classId } = req.params;
      const date = req.query.date || new Date().toISOString().slice(0, 10);
      const records = await this.academicService.getAttendance(classId, date, req.currentUser);
      res.json({ records });
    } catch (err) { next(err); }
  };

  saveAttendance = async (req, res, next) => {
    try {
      const date = (req.body.date || '').trim();
      assert(date, "Date is required.", 400);
      await this.academicService.saveAttendance(req.params.classId, date, req.body.records || [], req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  getMyAttendanceSummary = async (req, res, next) => {
    try {
      const { classId } = req.query;
      if (!classId) return res.json({ summary: null });
      const summary = await this.academicService.getMyAttendanceSummary(req.currentUser.id, classId);
      res.json({ summary });
    } catch (err) { next(err); }
  };

  listTeachers = async (req, res, next) => {
    try {
      const teachers = await this.academicService.listTeachers(req.currentUser.tenantId);
      res.json({ teachers });
    } catch (err) { next(err); }
  };
}

function assert(cond, msg, status) {
  if (!cond) {
    const err = new Error(msg);
    err.status = status || 400;
    throw err;
  }
}
