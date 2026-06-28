export async function createSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      slug             TEXT NOT NULL UNIQUE,
      email            TEXT NOT NULL,
      plan             TEXT NOT NULL DEFAULT 'free',
      status           TEXT NOT NULL DEFAULT 'active',
      institution_type TEXT NOT NULL DEFAULT 'SCHOOL',
      logo_url         TEXT,
      address          TEXT,
      phone            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'active',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant
      ON users(email, COALESCE(tenant_id, ''));

    CREATE TABLE IF NOT EXISTS user_sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id   ON user_sessions(user_id);

    CREATE TABLE IF NOT EXISTS contact_messages (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT NOT NULL,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

    CREATE TABLE IF NOT EXISTS student_profiles (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id          TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_id       TEXT,
      class_name       TEXT NOT NULL DEFAULT '',
      section          TEXT NOT NULL DEFAULT '',
      roll_number      TEXT NOT NULL DEFAULT '',
      admission_date   TEXT,
      date_of_birth    TEXT,
      gender           TEXT,
      blood_group      TEXT,
      phone            TEXT,
      address          TEXT,
      guardian_name    TEXT,
      guardian_phone   TEXT,
      guardian_relation TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_student_profiles_tenant_id ON student_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id   ON student_profiles(user_id);

    CREATE TABLE IF NOT EXISTS teacher_profiles (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id       TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      employee_id   TEXT,
      designation   TEXT NOT NULL DEFAULT '',
      department    TEXT NOT NULL DEFAULT '',
      subjects      TEXT NOT NULL DEFAULT '',
      qualification TEXT NOT NULL DEFAULT '',
      joining_date  TEXT,
      date_of_birth TEXT,
      gender        TEXT,
      blood_group   TEXT,
      phone         TEXT,
      address       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_tenant_id ON teacher_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id   ON teacher_profiles(user_id);

    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS institution_type TEXT NOT NULL DEFAULT 'SCHOOL';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
  `);
}
