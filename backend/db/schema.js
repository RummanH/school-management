export async function createSchema(pool) {
  // Stage 1 â€” create tables (idempotent; won't modify existing tables)
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

    CREATE TABLE IF NOT EXISTS user_sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT NOT NULL,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'NEW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classes (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name             TEXT NOT NULL,
      section          TEXT NOT NULL DEFAULT '',
      academic_year    TEXT NOT NULL DEFAULT '',
      class_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      description      TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS class_routines (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      day_of_week   TEXT NOT NULL,
      period_number INTEGER NOT NULL,
      subject       TEXT NOT NULL,
      teacher_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      start_time    TEXT NOT NULL DEFAULT '',
      end_time      TEXT NOT NULL DEFAULT '',
      room          TEXT NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(class_id, day_of_week, period_number)
    );

    CREATE TABLE IF NOT EXISTS syllabus_entries (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject       TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      chapter_count INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exam_schedules (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      exam_name   TEXT NOT NULL,
      subject     TEXT NOT NULL,
      exam_date   TEXT NOT NULL,
      start_time  TEXT NOT NULL DEFAULT '',
      end_time    TEXT NOT NULL DEFAULT '',
      total_marks INTEGER NOT NULL DEFAULT 100,
      room        TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exam_results (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      exam_schedule_id TEXT NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
      student_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      marks_obtained   NUMERIC(6,2),
      grade            TEXT NOT NULL DEFAULT '',
      remarks          TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(exam_schedule_id, student_user_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      class_id         TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attendance_date  TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'present',
      marked_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      note             TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(class_id, student_user_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id           TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_id        TEXT,
      class_name        TEXT NOT NULL DEFAULT '',
      section           TEXT NOT NULL DEFAULT '',
      roll_number       TEXT NOT NULL DEFAULT '',
      admission_date    TEXT,
      date_of_birth     TEXT,
      gender            TEXT,
      blood_group       TEXT,
      phone             TEXT,
      address           TEXT,
      guardian_name     TEXT,
      guardian_phone    TEXT,
      guardian_relation TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notices (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL DEFAULT 'notice',
      title        TEXT NOT NULL,
      body         TEXT NOT NULL DEFAULT '',
      audience     TEXT NOT NULL DEFAULT 'public',
      is_published BOOLEAN NOT NULL DEFAULT true,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL DEFAULT 'photo',
      url        TEXT NOT NULL,
      caption    TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guardian_students (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(guardian_user_id, student_user_id)
    );

    CREATE TABLE IF NOT EXISTS admission_applications (
      id                   TEXT PRIMARY KEY,
      reference_code       TEXT NOT NULL UNIQUE,
      applicant_name       TEXT NOT NULL,
      date_of_birth        TEXT,
      gender               TEXT,
      applying_for_class   TEXT NOT NULL DEFAULT '',
      guardian_name        TEXT NOT NULL,
      guardian_phone       TEXT NOT NULL,
      guardian_email       TEXT,
      previous_school      TEXT,
      photo_data           TEXT,
      status               TEXT NOT NULL DEFAULT 'submitted',
      admission_test_date  TEXT,
      notes                TEXT NOT NULL DEFAULT '',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teacher_profiles (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id       TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      employee_id   TEXT,
      designation   TEXT NOT NULL DEFAULT '',
      photo_url     TEXT,
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

    CREATE TABLE IF NOT EXISTS fee_categories (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      default_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      billing_cycle  TEXT NOT NULL DEFAULT 'monthly',
      is_active      BOOLEAN NOT NULL DEFAULT true,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fee_assignments (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      student_user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id         TEXT NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
      amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
      waiver_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
      scholarship_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
      fine_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
      start_period        TEXT NOT NULL DEFAULT '',
      end_period          TEXT NOT NULL DEFAULT '',
      status              TEXT NOT NULL DEFAULT 'active',
      notes               TEXT NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fee_invoices (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      student_user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period              TEXT NOT NULL,
      title               TEXT NOT NULL,
      due_date            TEXT,
      subtotal_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
      waiver_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
      scholarship_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
      fine_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
      paid_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
      status              TEXT NOT NULL DEFAULT 'unpaid',
      notes               TEXT NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(student_user_id, period)
    );

    CREATE TABLE IF NOT EXISTS fee_invoice_items (
      id                  TEXT PRIMARY KEY,
      invoice_id          TEXT NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
      category_id         TEXT REFERENCES fee_categories(id) ON DELETE SET NULL,
      assignment_id       TEXT REFERENCES fee_assignments(id) ON DELETE SET NULL,
      description         TEXT NOT NULL,
      amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
      waiver_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
      scholarship_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
      fine_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fee_payments (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_id      TEXT NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receipt_number  TEXT NOT NULL UNIQUE,
      amount          NUMERIC(10,2) NOT NULL,
      method          TEXT NOT NULL DEFAULT 'cash',
      payment_date    TEXT NOT NULL,
      reference_no    TEXT NOT NULL DEFAULT '',
      notes           TEXT NOT NULL DEFAULT '',
      collected_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );


    CREATE TABLE IF NOT EXISTS communication_threads (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      topic           TEXT NOT NULL DEFAULT '',
      student_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      guardian_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      teacher_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      admin_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS communication_messages (
      id                TEXT PRIMARY KEY,
      thread_id         TEXT NOT NULL REFERENCES communication_threads(id) ON DELETE CASCADE,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      sender_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body              TEXT NOT NULL,
      read_at           TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category      TEXT NOT NULL,
      amount        NUMERIC(10,2) NOT NULL,
      expense_date  TEXT NOT NULL,
      payee         TEXT NOT NULL DEFAULT '',
      method        TEXT NOT NULL DEFAULT 'cash',
      reference_no  TEXT NOT NULL DEFAULT '',
      notes         TEXT NOT NULL DEFAULT '',
      created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Stage 2 â€” add columns that may be missing on existing databases
  await pool.query(`
    ALTER TABLE tenants          ADD COLUMN IF NOT EXISTS institution_type TEXT NOT NULL DEFAULT 'SCHOOL';
    ALTER TABLE tenants          ADD COLUMN IF NOT EXISTS phone            TEXT;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS class_id         TEXT REFERENCES classes(id) ON DELETE SET NULL;
    ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS photo_url        TEXT;
  `);

  // Stage 3 â€” create indexes (all referenced columns now guaranteed to exist)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant
      ON users(email, COALESCE(tenant_id, ''));

    CREATE INDEX IF NOT EXISTS idx_tenants_slug               ON tenants(slug);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash   ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id      ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_classes_tenant_id          ON classes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_class_routines_class_id    ON class_routines(class_id);
    CREATE INDEX IF NOT EXISTS idx_syllabus_entries_class_id  ON syllabus_entries(class_id);
    CREATE INDEX IF NOT EXISTS idx_exam_schedules_class_id    ON exam_schedules(class_id);
    CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_date   ON exam_schedules(exam_date);
    CREATE INDEX IF NOT EXISTS idx_exam_results_exam_schedule_id ON exam_results(exam_schedule_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_student_user_id  ON exam_results(student_user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date      ON attendance_records(class_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student         ON attendance_records(student_user_id);

    CREATE INDEX IF NOT EXISTS idx_student_profiles_tenant_id ON student_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id   ON student_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_class_id  ON student_profiles(class_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_tenant_id ON teacher_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id   ON teacher_profiles(user_id);

    CREATE INDEX IF NOT EXISTS idx_guardian_students_guardian ON guardian_students(guardian_user_id);
    CREATE INDEX IF NOT EXISTS idx_guardian_students_student  ON guardian_students(student_user_id);

    CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(is_published, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notices_type      ON notices(type);

    CREATE INDEX IF NOT EXISTS idx_gallery_items_sort ON gallery_items(sort_order, created_at ASC);

    CREATE INDEX IF NOT EXISTS idx_admission_applications_reference ON admission_applications(reference_code);
    CREATE INDEX IF NOT EXISTS idx_admission_applications_status    ON admission_applications(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fee_categories_tenant     ON fee_categories(tenant_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_fee_assignments_student   ON fee_assignments(student_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_fee_assignments_category  ON fee_assignments(category_id);
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_tenant       ON fee_invoices(tenant_id, status, period);
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_student      ON fee_invoices(student_user_id, period);
    CREATE INDEX IF NOT EXISTS idx_fee_invoice_items_invoice ON fee_invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice      ON fee_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_student      ON fee_payments(student_user_id, payment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date      ON expenses(tenant_id, expense_date DESC);
    CREATE INDEX IF NOT EXISTS idx_comm_threads_tenant       ON communication_threads(tenant_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comm_messages_thread      ON communication_messages(thread_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_comm_messages_recipient   ON communication_messages(recipient_user_id, read_at, created_at DESC);
  `);
}


