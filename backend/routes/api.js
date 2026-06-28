import { Router } from "express";
import { ContactController } from "../controllers/contactController.js";
import { AuthController } from "../controllers/authController.js";
import { AdminController } from "../controllers/adminController.js";
import { TenantController } from "../controllers/tenantController.js";
import { UserController } from "../controllers/userController.js";
import { StudentController } from "../controllers/studentController.js";
import { TeacherController } from "../controllers/teacherController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { findTeacherByUserId } from "../repositories/teacherRepository.js";

export function createApiRouter({
  env, contactService, authService, tenantService,
  userService, studentService, teacherService, databaseManager,
}) {
  const router = Router();

  const contactController = new ContactController(contactService);
  const authController    = new AuthController(authService, env);
  const adminController   = new AdminController(databaseManager);
  const tenantController  = new TenantController(tenantService);
  const userController    = new UserController(userService);
  const studentController = new StudentController(studentService);
  const teacherController = new TeacherController(teacherService);

  const auth         = requireAuth(authService, env);
  const platformOnly = [auth, requireRole("system_developer")];
  const adminOnly    = [auth, requireRole("system_developer", "admin")];

  router.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Public
  router.post("/contact", contactController.submit);

  // Auth
  router.post("/auth/login",  authController.login);
  router.post("/auth/logout", authController.logout);
  router.get("/auth/me",      auth, authController.me);

  // Platform — system_developer only
  router.get("/platform/tenants",              ...platformOnly, tenantController.list);
  router.post("/platform/tenants",             ...platformOnly, tenantController.create);
  router.put("/platform/tenants/:id",          ...platformOnly, tenantController.update);
  router.patch("/platform/tenants/:id/status", ...platformOnly, tenantController.setStatus);

  // Users (admin accounts) — system_developer + admin
  router.get("/users",                     ...adminOnly, userController.list);
  router.post("/users",                    ...adminOnly, userController.create);
  router.put("/users/:id",                 ...adminOnly, userController.update);
  router.delete("/users/:id",              ...adminOnly, userController.remove);
  router.post("/users/:id/reset-password", ...adminOnly, userController.resetPassword);

  // Students — admin only (tenant-scoped)
  router.get("/students",                          auth, requireRole("admin"), studentController.list);
  router.post("/students",                         auth, requireRole("admin"), studentController.create);
  router.put("/students/:userId",                  auth, requireRole("admin"), studentController.update);
  router.delete("/students/:userId",               auth, requireRole("admin"), studentController.remove);

  // Teachers — admin only (tenant-scoped)
  router.get("/teachers",                          auth, requireRole("admin"), teacherController.list);
  router.post("/teachers",                         auth, requireRole("admin"), teacherController.create);
  router.put("/teachers/:userId",                  auth, requireRole("admin"), teacherController.update);
  router.delete("/teachers/:userId",               auth, requireRole("admin"), teacherController.remove);

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

  // Admin dashboard
  router.get("/admin/stats",               auth, adminController.getStats);
  router.get("/admin/contacts",            auth, adminController.getContacts);
  router.patch("/admin/contacts/:id/read", auth, adminController.markRead);

  return router;
}
