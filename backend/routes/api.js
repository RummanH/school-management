import { Router } from "express";
import { ContactController } from "../controllers/contactController.js";
import { AuthController } from "../controllers/authController.js";
import { AdminController } from "../controllers/adminController.js";
import { TenantController } from "../controllers/tenantController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export function createApiRouter({ env, contactService, authService, tenantService, databaseManager }) {
  const router = Router();
  const contactController = new ContactController(contactService);
  const authController = new AuthController(authService, env);
  const adminController = new AdminController(databaseManager);
  const tenantController = new TenantController(tenantService);

  const auth = requireAuth(authService, env);
  const platformOnly = [auth, requireRole("system_developer")];

  router.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Public
  router.post("/contact", contactController.submit);

  // Auth
  router.post("/auth/login", authController.login);
  router.post("/auth/logout", authController.logout);
  router.get("/auth/me", auth, authController.me);

  // Platform (system_developer only)
  router.get("/platform/tenants", ...platformOnly, tenantController.list);
  router.post("/platform/tenants", ...platformOnly, tenantController.create);
  router.put("/platform/tenants/:id", ...platformOnly, tenantController.update);
  router.patch("/platform/tenants/:id/status", ...platformOnly, tenantController.setStatus);

  // Admin (any authenticated user)
  router.get("/admin/stats", auth, adminController.getStats);
  router.get("/admin/contacts", auth, adminController.getContacts);
  router.patch("/admin/contacts/:id/read", auth, adminController.markRead);

  return router;
}
