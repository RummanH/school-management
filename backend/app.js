import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import { backendDistPath, frontendDistPath } from "./config/paths.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createApiRouter } from "./routes/api.js";

export function createApp({
  env, contactService, authService, tenantService,
  userService, studentService, teacherService, academicService, guardianService, databaseManager,
}) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", createApiRouter({
    env, contactService, authService, tenantService,
    userService, studentService, teacherService, academicService, guardianService, databaseManager,
  }));

  const staticRoot = fs.existsSync(backendDistPath) ? backendDistPath : frontendDistPath;

  if (fs.existsSync(staticRoot)) {
    app.use(express.static(staticRoot));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticRoot, "index.html"));
    });
  }

  app.use(errorHandler());

  return app;
}
