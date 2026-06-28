import { env } from "./config/env.js";
import { DatabaseManager } from "./db/pool.js";
import * as bootstrapService from "./services/bootstrapService.js";
import { ContactService } from "./services/contactService.js";
import { AuthService } from "./services/authService.js";
import { TenantService } from "./services/tenantService.js";
import { createApp } from "./app.js";

export async function createBackendApp() {
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  await bootstrapService.initialize(databaseManager, env);

  const contactService = new ContactService(databaseManager);
  const authService = new AuthService(databaseManager, env);
  const tenantService = new TenantService(databaseManager);

  const app = createApp({ env, contactService, authService, tenantService, databaseManager });
  return { app, databaseManager, env };
}
