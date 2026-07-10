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
import { FeeController } from "../controllers/feeController.js";
import { CommunicationController } from "../controllers/communicationController.js";
import { HrController } from "../controllers/hrController.js";
import { SecurityController } from "../controllers/securityController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requirePermission } from "../middleware/permissions.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { auditAction, auditMutations } from "../middleware/audit.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { findTeacherByUserId } from "../repositories/teacherRepository.js";

export function createApiRouter({
  env, contactService, authService, tenantService,
  userService, studentService, teacherService, academicService,
  guardianService, noticeService, galleryService, admissionService, feeService, communicationService, hrService, databaseManager,
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
  const feeController       = new FeeController(feeService);
  const communicationController = new CommunicationController(communicationService);
  const hrController = new HrController(hrService);
  const securityController = new SecurityController(databaseManager);

  const auth          = requireAuth(authService, env);
  const platformOnly  = [auth, requirePermission("platformManage")];
  const adminOnly     = [auth, requirePermission("adminManage")];
  const staffAndAdmin = [auth, requirePermission("academicWrite")];
  const guardianOnly  = [auth, requirePermission("guardianUse")];
  const financeAdmin  = [auth, requirePermission("financeManage")];
  const communicationUsers = [auth, requirePermission("communicationUse")];
  const securityAudit = [auth, requirePermission("securityAudit")];
  const dataExport = [auth, requirePermission("dataExport")];

  router.get("/health", (_req, res) => res.json({ status: "ok" }));
  router.use(auditMutations(databaseManager));

  // Public
  router.post("/contact", rateLimit({ windowMs: 60_000, max: 5, keyPrefix: "contact" }), contactController.submit);
  router.get("/notices/public", noticeController.listPublic);
  router.get("/gallery/public", galleryController.listPublic);
  router.post("/admission/apply", rateLimit({ windowMs: 60_000, max: 3, keyPrefix: "admission" }), admissionController.apply);
  router.get("/admission/status", rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "admission-status" }), admissionController.checkStatus);
  router.get("/academic/classes/public", academicController.listClassesPublic);
  router.get("/teachers/public", teacherController.listPublic);

  // Auth
  router.post("/auth/login", rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "login" }), authController.login);
  router.post("/auth/password-reset/request", rateLimit({ windowMs: 60_000, max: 3, keyPrefix: "password-reset" }), authController.requestPasswordReset);
  router.post("/auth/password-reset/confirm", rateLimit({ windowMs: 60_000, max: 5, keyPrefix: "password-reset-confirm" }), authController.confirmPasswordReset);
  router.post("/auth/logout", authController.logout);
  router.get("/auth/me",      auth, authController.me);

  // Security & audit
  router.get("/security/audit-logs", ...securityAudit, securityController.auditLogs);
  router.get("/security/permissions", ...securityAudit, securityController.permissionMatrix);

  // Platform - system_developer only
  router.get("/platform/tenants",              ...platformOnly, tenantController.list);
  router.post("/platform/tenants",             ...platformOnly, tenantController.create);
  router.put("/platform/tenants/:id",          ...platformOnly, tenantController.update);
  router.patch("/platform/tenants/:id/status", ...platformOnly, tenantController.setStatus);

  // Users (admin + guardian accounts only) - system_developer + admin
  router.get("/users",                     ...adminOnly, userController.list);
  router.post("/users",                    ...adminOnly, userController.create);
  router.put("/users/:id",                 ...adminOnly, userController.update);
  router.delete("/users/:id",              ...adminOnly, userController.remove);
  router.post("/users/:id/reset-password", ...adminOnly, userController.resetPassword);

  // Students - admin only (tenant-scoped)
  router.get("/students",         ...adminOnly, studentController.list);
  router.post("/students",        ...adminOnly, studentController.create);
  router.put("/students/:userId", ...adminOnly, studentController.update);
  router.delete("/students/:userId", ...adminOnly, studentController.remove);
  router.get("/students/:studentUserId/guardians", ...adminOnly, guardianController.listGuardiansForStudent);

  // Teachers - admin only (tenant-scoped)
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

  // Academic Portal

  // Structure read is staffAndAdmin: teachers need the subject master and
  // teacher-subject assignments to drive routine/syllabus pickers. Writes stay admin.
  router.get("/academic/structure",      ...staffAndAdmin, academicController.getStructure);
  router.post("/academic/structure/:type", ...adminOnly, academicController.createStructureRecord);
  router.put("/academic/structure/:type/:id", ...adminOnly, academicController.updateStructureRecord);
  router.delete("/academic/structure/:type/:id", ...adminOnly, academicController.deleteStructureRecord);

  // Exams as first-class records (name/term/session); schedule rows live under
  // /academic/classes/:classId/exams and link back via examId.
  router.get("/academic/exam-groups",        ...staffAndAdmin, academicController.listExamGroups);
  router.post("/academic/exam-groups",       ...adminOnly, academicController.createExamGroup);
  router.put("/academic/exam-groups/:id",    ...adminOnly, academicController.updateExamGroup);
  router.delete("/academic/exam-groups/:id", ...adminOnly, academicController.deleteExamGroup);

  // Year-end bulk promotion (per-student movements created under the hood)
  router.post("/academic/promote", ...adminOnly, academicController.bulkPromote);

  // Classes (admin manages, all authenticated can list)
  router.get("/academic/classes",      auth, academicController.listClasses);
  router.post("/academic/classes",     ...adminOnly, academicController.createClass);
  router.put("/academic/classes/:id",  ...adminOnly, academicController.updateClass);
  router.delete("/academic/classes/:id", ...adminOnly, academicController.deleteClass);

  // Teachers - admin only (tenant-scoped)
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
  router.post("/academic/classes/:classId/attendance/import", ...staffAndAdmin, academicController.importAttendance);
  router.get("/academic/classes/:classId/attendance/monthly", ...staffAndAdmin, academicController.getMonthlyAttendanceReport);
  router.get("/academic/attendance/corrections", ...staffAndAdmin, academicController.getAttendanceCorrections);
  router.post("/academic/attendance/corrections", ...staffAndAdmin, academicController.requestAttendanceCorrection);
  router.post("/academic/attendance/corrections/:id/review", ...adminOnly, academicController.reviewAttendanceCorrection);
  router.get("/academic/me/attendance",                auth, academicController.getMyAttendanceSummary);

  // Guardian Portal

  // Admin manages guardian/student links (tenant-scoped)
  router.get("/guardians/:guardianId/wards",              ...adminOnly, guardianController.listWardLinks);
  router.post("/guardians/:guardianId/wards",              ...adminOnly, guardianController.linkWard);
  router.delete("/guardians/:guardianId/wards/:studentUserId", ...adminOnly, guardianController.unlinkWard);

  // Guardian's own wards
  router.get("/guardian/wards",                           ...guardianOnly, guardianController.myWards);
  router.get("/guardian/wards/:studentUserId/results",     ...guardianOnly, guardianController.wardResults);
  router.get("/guardian/wards/:studentUserId/attendance",  ...guardianOnly, guardianController.wardAttendance);

  // HR & Staff Management
  router.get("/hr", ...adminOnly, hrController.overview);
  router.post("/hr/staff", ...adminOnly, hrController.saveStaff);
  router.delete("/hr/staff/:id", ...adminOnly, hrController.removeStaff);
  router.post("/hr/attendance", ...adminOnly, hrController.markAttendance);
  router.post("/hr/leaves", ...adminOnly, hrController.requestLeave);
  router.patch("/hr/leaves/:id", ...adminOnly, hrController.reviewLeave);
  router.post("/hr/payroll", ...adminOnly, hrController.savePayroll);
  router.post("/hr/documents", ...adminOnly, hrController.addDocument);
  router.post("/hr/notes", ...adminOnly, hrController.addNote);

  // Communication
  router.get("/communication/threads",          ...communicationUsers, communicationController.listThreads);
  router.post("/communication/threads",         ...communicationUsers, communicationController.createThread);
  router.get("/communication/threads/:threadId", ...communicationUsers, communicationController.getThread);
  router.post("/communication/threads/:threadId/messages", ...communicationUsers, communicationController.reply);
  router.get("/communication/recipients",       ...communicationUsers, communicationController.recipients);

  // Notices & News

  // Portal feed - any authenticated user sees notices for their role
  router.get("/notices/feed", auth, noticeController.listFeed);

  // Admin/teacher management (admin + teacher can create/edit, only admin deletes)
  router.get("/admin/notices",         ...staffAndAdmin, noticeController.listAll);
  router.post("/admin/notices",        ...staffAndAdmin, noticeController.create);
  router.put("/admin/notices/:id",     ...staffAndAdmin, noticeController.update);
  router.delete("/admin/notices/:id",  ...adminOnly, noticeController.remove);

  // Gallery (website content management)

  router.get("/admin/gallery",         ...adminOnly, galleryController.listAll);
  router.post("/admin/gallery",        ...adminOnly, galleryController.create);
  router.put("/admin/gallery/:id",     ...adminOnly, galleryController.update);
  router.delete("/admin/gallery/:id",  ...adminOnly, galleryController.remove);

  // Online Admission

  router.get("/admin/admissions",     ...adminOnly, admissionController.listAll);
  router.get("/admin/admissions/:id", ...adminOnly, admissionController.getById);
  router.put("/admin/admissions/:id", ...adminOnly, admissionController.updateStatus);
  router.put("/admin/admissions/documents/:documentId", ...adminOnly, admissionController.updateDocumentVerification);
  router.get("/admin/admissions/documents/:documentId/download", ...dataExport, auditAction(databaseManager, "export.admission_document", "admission_document"), admissionController.downloadDocument);
  // Fees & Accounting — admin managed, student/guardian read-only ledgers
  router.get("/fees/categories",          ...financeAdmin, feeController.listCategories);
  router.post("/fees/categories",         ...financeAdmin, feeController.createCategory);
  router.put("/fees/categories/:id",      ...financeAdmin, feeController.updateCategory);
  router.delete("/fees/categories/:id",   ...financeAdmin, feeController.deleteCategory);

  router.get("/fees/assignments",         ...financeAdmin, feeController.listAssignments);
  router.post("/fees/assignments",        ...financeAdmin, feeController.createAssignment);
  router.put("/fees/assignments/:id",     ...financeAdmin, feeController.updateAssignment);
  router.delete("/fees/assignments/:id",  ...financeAdmin, feeController.deleteAssignment);

  router.get("/fees/invoices",            ...financeAdmin, feeController.listInvoices);
  router.post("/fees/invoices/generate",  ...financeAdmin, feeController.generateInvoices);
  router.get("/fees/invoices/:id",        ...financeAdmin, feeController.getInvoice);
  router.post("/fees/invoices/:id/payments", ...financeAdmin, feeController.recordPayment);
  router.get("/fees/payments",            ...financeAdmin, feeController.listPayments);

  router.get("/fees/expenses",            ...financeAdmin, feeController.listExpenses);
  router.post("/fees/expenses",           ...financeAdmin, feeController.createExpense);
  router.delete("/fees/expenses/:id",     ...financeAdmin, feeController.deleteExpense);
  router.get("/fees/report",              ...financeAdmin, feeController.getReport);

  router.get("/fees/me",                  auth, feeController.getMyFees);
  router.get("/guardian/wards/:studentUserId/fees", ...guardianOnly, feeController.getWardFees);

  // Admin dashboard
  router.get("/admin/stats",               auth, adminController.getStats);
  router.get("/admin/reports", ...dataExport, auditAction(databaseManager, "export.admin_reports", "report"), adminController.getReports);
  router.get("/admin/contacts",            auth, adminController.getContacts);
  router.patch("/admin/contacts/:id/read", auth, adminController.markRead);

  return router;
}

