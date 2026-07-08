import { env } from "./config/env.js";
import { DatabaseManager } from "./db/pool.js";
import * as bootstrapService from "./services/bootstrapService.js";
import { ContactService } from "./services/contactService.js";
import { AuthService } from "./services/authService.js";
import { TenantService } from "./services/tenantService.js";
import { UserService } from "./services/userService.js";
import { StudentService } from "./services/studentService.js";
import { TeacherService } from "./services/teacherService.js";
import { AcademicService } from "./services/academicService.js";
import { GuardianService } from "./services/guardianService.js";
import { NoticeService } from "./services/noticeService.js";
import { GalleryService } from "./services/galleryService.js";
import { AdmissionService } from "./services/admissionService.js";
import { FeeService } from "./services/feeService.js";
import { CommunicationService } from "./services/communicationService.js";
import { createApp } from "./app.js";

export async function createBackendApp() {
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  await bootstrapService.initialize(databaseManager, env);

  const contactService   = new ContactService(databaseManager);
  const authService      = new AuthService(databaseManager, env);
  const tenantService    = new TenantService(databaseManager);
  const userService      = new UserService(databaseManager);
  const studentService   = new StudentService(databaseManager);
  const teacherService   = new TeacherService(databaseManager);
  const academicService  = new AcademicService(databaseManager);
  const guardianService  = new GuardianService(databaseManager);
  const noticeService    = new NoticeService(databaseManager);
  const galleryService   = new GalleryService(databaseManager);
  const admissionService = new AdmissionService(databaseManager);
  const feeService       = new FeeService(databaseManager);
  const communicationService = new CommunicationService(databaseManager);

  const app = createApp({
    env, contactService, authService, tenantService,
    userService, studentService, teacherService, academicService,
    guardianService, noticeService, galleryService, admissionService, feeService, communicationService, databaseManager,
  });
  return { app, databaseManager, env };
}


