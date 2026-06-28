import { createSchema } from "../db/schema.js";
import { hashPassword } from "../lib/passwords.js";
import { createId } from "../lib/ids.js";
import { countUsersWithRole, insertUser } from "../repositories/userRepository.js";

export async function initialize(databaseManager, env) {
  const pool = databaseManager.getPool();
  try {
    await createSchema(pool);
    await seedSystemDeveloper(pool, env);
  } catch (error) {
    try {
      await databaseManager.switchToFallbackDatabase();
      const fallbackPool = databaseManager.getPool();
      await createSchema(fallbackPool);
      await seedSystemDeveloper(fallbackPool, env);
    } catch {
      throw error;
    }
  }
}

async function seedSystemDeveloper(pool, env) {
  const { rows } = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'system_developer'`);
  if (Number(rows[0].count) > 0) return;

  const passwordHash = await hashPassword(env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD);
  await pool.query(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)`,
    [createId("user"), null, env.DEFAULT_SYSTEM_DEVELOPER_NAME, env.DEFAULT_SYSTEM_DEVELOPER_EMAIL, passwordHash, "system_developer"],
  );
  console.log(`System developer created: ${env.DEFAULT_SYSTEM_DEVELOPER_EMAIL}`);
}
