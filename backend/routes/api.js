import { Router } from "express";
import { ContactController } from "../controllers/contactController.js";
import { AuthController } from "../controllers/authController.js";
import { AdminController } from "../controllers/adminController.js";
import { TenantController } from "../controllers/tenantController.js";
import { UserController } from "../controllers/userController.js";
import { StudentController } from "../controllers/studentController.js";
import { TeacherController } from "../controllers/teacherController.js";
import { AcademicController } from "../controllers/academicController.js";
import { GuardianController } from "../controllers/guardianController.js";
import { NoticeController } from "../controllers/noticeController.js";
import { GalleryController } from "../controllers/galleryController.js";
import { AdmissionController } from "../controllers/admissionController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { findTeacherByUserId } from "../repositories/teacherRepository.js";

export function createApiRouter({
  env, contactService, authService, tenantService,
  userService, studentService, teacherService, academicService,
  guardianService, noticeService, galleryService, admissionService, databaseManager,
}) {
  const router = Router();

  const contactController   = new ContactController(contactService);
  const authController      = new AuthController(authService, env);
  const adminController     = new AdminController(databaseManager);
  const tenantController    = new TenantController(tenantService);
  const userController      = new UserController(userService);
  const studentController   = new StudentController(studentService);
  const teacherController   = new TeacherController(teacherService);
  const academicController  = new AcademicController(academicService);
  const guardianController  = new GuardianController(guardianService);
  const noticeController    = new NoticeController(noticeService);
  const galleryController   = new GalleryController(galleryService);
  const admissionController = new AdmissionController(admissionService);

  const auth          = requireAuth(authService, env);
  const platformOnly  = [auth, requireRole("system_developer")];
  const adminOnly     = [auth, requireRole("system_developer", "admin")];
  const staffAndAdmin = [auth, requireRole("system_developer", "admin", "teacher")];
  const guardianOnly  = [auth, requireRole("guardian")];

  router.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Public
  router.post("/contact", contactController.submit);
  router.get("/notices/public", noticeController.listPublic);
  router.get("/gallery/public", galleryController.listPublic);
  router.post("/admission/apply",  admissionController.apply);
  router.get("/admission/status",  admissionController.checkStatus);

  // Auth
  router.post("/auth/login",  authController.login);
  router.post("/auth/logout", authController.logout);
  router.get("/auth/me",      auth, authController.me);

  // Platform — system_developer only
  router.get("/platform/tenants",              ...platformOnly, tenantController.list);
  router.post("/platform/tenants",             ...platformOnly, tenantController.create);
  router.put("/platform/tenants/:id",          ...platformOnly, tenantController.update);
  router.patch("/platform/tenants/:id/status", ...platformOnly, tenantController.setStatus);

  // Users (admin + guardian accounts only) — system_developer + admin
  router.get("/users",                     ...adminOnly, userController.list);
  router.post("/users",                    ...adminOnly, userController.create);
  router.put("/users/:id",                 ...adminOnly, userController.update);
  router.delete("/users/:id",              ...adminOnly, userController.remove);
  router.post("/users/:id/reset-password", ...adminOnly, userController.resetPassword);

  // Students — admin only (tenant-scoped)
  router.get("/students",         ...adminOnly, studentController.list);
  router.post("/students",        ...adminOnly, studentController.create);
  router.put("/students/:userId", ...adminOnly, studentController.update);
  router.delete("/students/:userId", ...adminOnly, studentController.remove);
  router.get("/students/:studentUserId/guardians", ...adminOnly, guardianController.listGuardiansForStudent);

  // Teachers — admin only (tenant-scoped)
  router.get("/teachers",         ...adminOnly, teacherController.list);
  router.post("/teachers",        ...adminOnly, teacherController.create);
  router.put("/teachers/:userId", ...adminOnly, teacherController.update);
  router.delete("/teachers/:userId", ...adminOnly, teacherController.remove);

  // Logged-in user's own profile (student / teacher)
  router.get("/me/profile", auth, async (req, res, next) => {
    try {
      const { role, id: userId } = req.currentUser;
      let profile = null;
      await databaseManager.withClient(async (client) => {
        if (role === "student") profile = await findStudentByUserId(client, userId);
        else if (role === "teacher") profile = await findTeacherByUserId(client, userId);
      });
      res.json({ profile });
    } catch (err) { next(err); }
  });

  // ── Academic Portal ──────────────────────────────────────────────────────

  // Classes (admin manages, all authenticated can list)
  router.get("/academic/classes",      auth, academicController.listClasses);
  router.post("/academic/classes",     ...adminOnly, academicController.createClass);
  router.put("/academic/classes/:id",  ...adminOnly, academicController.updateClass);
  router.delete("/academic/classes/:id", ...adminOnly, academicController.deleteClass);

  // Teachers list (for class teacher picker, routine assignment)
  router.get("/academic/teachers", ...staffAndAdmin, academicController.listTeachers);

  // Class routine (admin + teacher can edit, all can view)
  router.get("/academic/classes/:classId/routine",  auth, academicController.getRoutine);
  router.post("/academic/classes/:classId/routine", ...staffAndAdmin, academicController.saveRoutineEntry);
  router.delete("/academic/routine/:entryId",       ...adminOnly, academicController.deleteRoutineEntry);

  // Syllabus (admin + teacher can edit, all can view)
  router.get("/academic/classes/:classId/syllabus",       auth, academicController.getSyllabus);
  router.post("/academic/classes/:classId/syllabus",      ...staffAndAdmin, academicController.createSyllabusEntry);
  router.put("/academic/syllabus/:entryId",               ...staffAndAdmin, academicController.updateSyllabusEntry);
  router.delete("/academic/syllabus/:entryId",            ...adminOnly, academicController.deleteSyllabusEntry);

  // Exam schedules (admin manages, all can view)
  router.get("/academic/classes/:classId/exams",  auth, academicController.getExams);
  router.post("/academic/classes/:classId/exams", ...adminOnly, academicController.createExam);
  router.put("/academic/exams/:examId",           ...adminOnly, academicController.updateExam);
  router.delete("/academic/exams/:examId",        ...adminOnly, academicController.deleteExam);

  // Exam results (admin + teacher enter, students view own)
  router.get("/academic/exams/:examId/results",   ...staffAndAdmin, academicController.getResults);
  router.post("/academic/exams/:examId/results",  ...staffAndAdmin, academicController.saveResults);
  router.get("/academic/me/results",              auth, academicController.getMyResults);

  // Attendance (admin + teacher mark, students view summary)
  router.get("/academic/classes/:classId/attendance",  ...staffAndAdmin, academicController.getAttendance);
  router.post("/academic/classes/:classId/attendance", ...staffAndAdmin, academicController.saveAttendance);
  router.get("/academic/me/attendance",                auth, academicController.getMyAttendanceSummary);

  // ── Guardian Portal ──────────────────────────────────────────────────────

  // Admin manages guardian ↔ student links (tenant-scoped)
  router.get("/guardians/:guardianId/wards",              ...adminOnly, guardianController.listWardLinks);
  router.post("/guardians/:guardianId/wards",              ...adminOnly, guardianController.linkWard);
  router.delete("/guardians/:guardianId/wards/:studentUserId", ...adminOnly, guardianController.unlinkWard);

  // Guardian's own wards
  router.get("/guardian/wards",                           ...guardianOnly, guardianController.myWards);
  router.get("/guardian/wards/:studentUserId/results",     ...guardianOnly, guardianController.wardResults);
  router.get("/guardian/wards/:studentUserId/attendance",  ...guardianOnly, guardianController.wardAttendance);

  // ── Notices & News ───────────────────────────────────────────────────────

  // Portal feed — any authenticated user sees notices for their role
  router.get("/notices/feed", auth, noticeController.listFeed);

  // Admin/teacher management (admin + teacher can create/edit, only admin deletes)
  router.get("/admin/notices",         ...staffAndAdmin, noticeController.listAll);
  router.post("/admin/notices",        ...staffAndAdmin, noticeController.create);
  router.put("/admin/notices/:id",     ...staffAndAdmin, noticeController.update);
  router.delete("/admin/notices/:id",  ...adminOnly, noticeController.remove);

  // ── Gallery (website content management) ────────────────────────────────

  router.get("/admin/gallery",         ...adminOnly, galleryController.listAll);
  router.post("/admin/gallery",        ...adminOnly, galleryController.create);
  router.put("/admin/gallery/:id",     ...adminOnly, galleryController.update);
  router.delete("/admin/gallery/:id",  ...adminOnly, galleryController.remove);

  // ── Online Admission ─────────────────────────────────────────────────────

  router.get("/admin/admissions",     ...adminOnly, admissionController.listAll);
  router.get("/admin/admissions/:id", ...adminOnly, admissionController.getById);
  router.put("/admin/admissions/:id", ...adminOnly, admissionController.updateStatus);

  // Admin dashboard
  router.get("/admin/stats",               auth, adminController.getStats);
  router.get("/admin/contacts",            auth, adminController.getContacts);
  router.patch("/admin/contacts/:id/read", auth, adminController.markRead);

  return router;
}
