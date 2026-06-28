import pg from "pg";

const { Pool, types } = pg;

types.setTypeParser(1082, (val) => val);

function createPool(connectionString) {
  const max = process.env.DB_MAX_CONNECTIONS ? Number(process.env.DB_MAX_CONNECTIONS) : 10;
  return new Pool({
    connectionString,
    max,
    ssl: connectionString.includes("sslmode=no-verify") ? { rejectUnauthorized: false } : undefined,
  });
}

function withPostgresDatabase(connectionString) {
  const url = new URL(connectionString);
  url.pathname = "/postgres";
  return url.toString();
}

export class DatabaseManager {
  constructor(connectionString) {
    this.originalDatabaseUrl = connectionString;
    this.activeDatabaseUrl = connectionString;
    this.pool = createPool(connectionString);
  }

  getPool() {
    return this.pool;
  }

  getActiveDatabaseUrl() {
    return this.activeDatabaseUrl;
  }

  isUsingFallbackDatabase() {
    return this.activeDatabaseUrl !== this.originalDatabaseUrl;
  }

  async switchToFallbackDatabase() {
    await this.pool.end();
    this.activeDatabaseUrl = withPostgresDatabase(this.originalDatabaseUrl);
    this.pool = createPool(this.activeDatabaseUrl);
    return this.pool;
  }

  async withClient(work) {
    const client = await this.pool.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  async withTransaction(work, { retries = 1 } = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "40P01" && attempt < retries) {
          continue;
        }
        throw error;
      } finally {
        client.release();
      }
    }
  }
}
