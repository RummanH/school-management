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


    CREATE TABLE IF NOT EXISTS audit_logs (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT REFERENCES tenants(id) ON DELETE SET NULL,
      actor_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      actor_role      TEXT NOT NULL DEFAULT '',
      action          TEXT NOT NULL,
      entity_type     TEXT NOT NULL DEFAULT '',
      entity_id       TEXT NOT NULL DEFAULT '',
      method          TEXT NOT NULL DEFAULT '',
      path            TEXT NOT NULL DEFAULT '',
      ip_address      TEXT NOT NULL DEFAULT '',
      user_agent      TEXT NOT NULL DEFAULT '',
      metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id              TEXT PRIMARY KEY,
      email           TEXT NOT NULL,
      tenant_id       TEXT REFERENCES tenants(id) ON DELETE SET NULL,
      ip_address      TEXT NOT NULL DEFAULT '',
      success         BOOLEAN NOT NULL DEFAULT false,
      failure_reason  TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS account_lockouts (
      id              TEXT PRIMARY KEY,
      email           TEXT NOT NULL,
      tenant_id       TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      locked_until    TIMESTAMPTZ NOT NULL,
      failed_count    INTEGER NOT NULL DEFAULT 0,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(email, tenant_id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash      TEXT NOT NULL UNIQUE,
      expires_at      TIMESTAMPTZ NOT NULL,
      used_at         TIMESTAMPTZ,
      requested_ip    TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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


    CREATE TABLE IF NOT EXISTS academic_sessions (
      id         TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      start_date TEXT,
      end_date   TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS academic_terms (
      id         TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES academic_sessions(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      start_date TEXT,
      end_date   TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code        TEXT NOT NULL DEFAULT '',
      name        TEXT NOT NULL,
      department  TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
      id         TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      class_id   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES academic_sessions(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(teacher_id, subject_id, class_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS grading_policies (
      id           TEXT PRIMARY KEY,
      tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      min_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
      max_percent  NUMERIC(5,2) NOT NULL DEFAULT 100,
      grade        TEXT NOT NULL,
      grade_point  NUMERIC(4,2) NOT NULL DEFAULT 0,
      is_passing   BOOLEAN NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_academic_movements (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      movement_type TEXT NOT NULL,
      from_class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
      to_class_id   TEXT REFERENCES classes(id) ON DELETE SET NULL,
      from_section  TEXT NOT NULL DEFAULT '',
      to_section    TEXT NOT NULL DEFAULT '',
      from_session_id TEXT REFERENCES academic_sessions(id) ON DELETE SET NULL,
      to_session_id   TEXT REFERENCES academic_sessions(id) ON DELETE SET NULL,
      effective_date TEXT NOT NULL,
      reason        TEXT NOT NULL DEFAULT '',
      created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

    CREATE TABLE IF NOT EXISTS exams (
      id         TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES academic_sessions(id) ON DELETE SET NULL,
      term_id    TEXT REFERENCES academic_terms(id) ON DELETE SET NULL,
      name       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      period_number    INTEGER NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'present',
      marked_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      note             TEXT NOT NULL DEFAULT '',
      absence_reason   TEXT NOT NULL DEFAULT '',
      guardian_alert_sent BOOLEAN NOT NULL DEFAULT false,
      guardian_alert_sent_at TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(class_id, student_user_id, attendance_date)
    );


    CREATE TABLE IF NOT EXISTS attendance_correction_requests (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      attendance_id    TEXT REFERENCES attendance_records(id) ON DELETE CASCADE,
      class_id         TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attendance_date  TEXT NOT NULL,
      period_number    INTEGER NOT NULL DEFAULT 0,
      requested_status TEXT NOT NULL,
      requested_reason TEXT NOT NULL DEFAULT '',
      request_note     TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'pending',
      requested_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at      TIMESTAMPTZ,
      review_note      TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
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


    CREATE TABLE IF NOT EXISTS admission_documents (
      id              TEXT PRIMARY KEY,
      application_id  TEXT NOT NULL REFERENCES admission_applications(id) ON DELETE CASCADE,
      document_type   TEXT NOT NULL,
      original_name   TEXT NOT NULL,
      mime_type       TEXT NOT NULL,
      file_size       INTEGER NOT NULL DEFAULT 0,
      storage_key     TEXT NOT NULL UNIQUE,
      verification_status TEXT NOT NULL DEFAULT 'pending',
      verification_notes  TEXT NOT NULL DEFAULT '',
      uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      verified_at     TIMESTAMPTZ,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      default_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
      billing_cycle   TEXT NOT NULL DEFAULT 'monthly',
      late_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      is_active       BOOLEAN NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fee_structures (
      id           TEXT PRIMARY KEY,
      tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      class_id     TEXT REFERENCES classes(id) ON DELETE CASCADE,
      category_id  TEXT NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
      amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
      is_active    BOOLEAN NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, class_id, category_id)
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
      fine_applied        BOOLEAN NOT NULL DEFAULT false,
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

    -- Full member list for a thread (1:1 or group). The legacy participant_one/
    -- two columns above only ever supported exactly two people; this table is
    -- the source of truth for access control and membership going forward.
    CREATE TABLE IF NOT EXISTS communication_thread_participants (
      id         TEXT PRIMARY KEY,
      thread_id  TEXT NOT NULL REFERENCES communication_threads(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(thread_id, user_id)
    );

    -- Per-participant read tracking for group threads, where a single
    -- recipient_user_id/read_at pair on the message no longer applies.
    CREATE TABLE IF NOT EXISTS communication_message_reads (
      id         TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES communication_messages(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS staff_profiles (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_type     TEXT NOT NULL DEFAULT 'non_teaching',
      name           TEXT NOT NULL,
      employee_id    TEXT,
      designation    TEXT NOT NULL DEFAULT '',
      department     TEXT NOT NULL DEFAULT '',
      qualification  TEXT NOT NULL DEFAULT '',
      phone          TEXT,
      email          TEXT,
      address        TEXT,
      joining_date   TEXT,
      contract_type  TEXT NOT NULL DEFAULT 'permanent',
      base_salary    NUMERIC(10,2) NOT NULL DEFAULT 0,
      status         TEXT NOT NULL DEFAULT 'active',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS staff_attendance (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_id        TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'present',
      note            TEXT NOT NULL DEFAULT '',
      marked_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(staff_id, attendance_date)
    );

    CREATE TABLE IF NOT EXISTS staff_leave_requests (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_id    TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      leave_type  TEXT NOT NULL DEFAULT 'casual',
      start_date  TEXT NOT NULL,
      end_date    TEXT NOT NULL,
      reason      TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS staff_payroll_records (
      id           TEXT PRIMARY KEY,
      tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_id     TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      period       TEXT NOT NULL,
      base_salary  NUMERIC(10,2) NOT NULL DEFAULT 0,
      allowances   NUMERIC(10,2) NOT NULL DEFAULT 0,
      deductions   NUMERIC(10,2) NOT NULL DEFAULT 0,
      net_salary   NUMERIC(10,2) NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'draft',
      paid_at      TEXT,
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(staff_id, period)
    );

    CREATE TABLE IF NOT EXISTS staff_documents (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_id      TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL DEFAULT 'joining',
      title         TEXT NOT NULL,
      file_url      TEXT NOT NULL DEFAULT '',
      notes         TEXT NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS staff_performance_notes (
      id         TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_id   TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
      note       TEXT NOT NULL,
      rating     INTEGER,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

    CREATE TABLE IF NOT EXISTS donations (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      donor_name     TEXT NOT NULL DEFAULT '',
      amount         NUMERIC(10,2) NOT NULL,
      donation_date  TEXT NOT NULL,
      method         TEXT NOT NULL DEFAULT 'cash',
      notes          TEXT NOT NULL DEFAULT '',
      received_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS finance_transactions (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      direction        TEXT NOT NULL,
      source_type      TEXT NOT NULL,
      source_id        TEXT NOT NULL,
      amount           NUMERIC(10,2) NOT NULL,
      method           TEXT NOT NULL DEFAULT 'cash',
      category         TEXT NOT NULL DEFAULT '',
      transaction_date TEXT NOT NULL,
      recorded_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      notes            TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(source_type, source_id)
    );

    -- Every generated PDF (report card, certificate, admit card, ID card,
    -- fee receipt...) gets one row here, keyed by a short public verify_code
    -- printed as a QR on the document itself, so anyone (another school,
    -- an employer) can confirm authenticity at /verify/:code without login.
    CREATE TABLE IF NOT EXISTS document_issuances (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type   TEXT NOT NULL,
      verify_code     TEXT NOT NULL UNIQUE,
      issued_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Stage 2 â€” add columns that may be missing on existing databases
  await pool.query(`
    -- Own-profile page (phone/address/photo) reads and writes these columns
    -- via userRepository.js, but they were never added to the users table.
    ALTER TABLE users            ADD COLUMN IF NOT EXISTS phone            TEXT;
    ALTER TABLE users            ADD COLUMN IF NOT EXISTS address          TEXT;
    ALTER TABLE users            ADD COLUMN IF NOT EXISTS photo_url        TEXT;
    ALTER TABLE tenants          ADD COLUMN IF NOT EXISTS institution_type TEXT NOT NULL DEFAULT 'SCHOOL';
    ALTER TABLE tenants          ADD COLUMN IF NOT EXISTS phone            TEXT;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS class_id         TEXT REFERENCES classes(id) ON DELETE SET NULL;
    ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS photo_url        TEXT;
    ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS period_number INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS absence_reason TEXT NOT NULL DEFAULT '';
    ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS guardian_alert_sent BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS guardian_alert_sent_at TIMESTAMPTZ;
    ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_class_id_student_user_id_attendance_date_key;

    -- Tenant isolation: notices, gallery_items, and admission_applications were
    -- created without a tenant_id, so every tenant's admin could read/edit every
    -- other tenant's rows. Backfill existing rows before enforcing NOT NULL.
    ALTER TABLE notices ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE notices n SET tenant_id = u.tenant_id
      FROM users u WHERE u.id = n.created_by AND n.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
    UPDATE notices SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;
    ALTER TABLE notices ALTER COLUMN tenant_id SET NOT NULL;

    ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE gallery_items SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;
    ALTER TABLE gallery_items ALTER COLUMN tenant_id SET NOT NULL;

    -- admission_applications: every /admission page visit now resolves a
    -- schoolSlug (either the ?school= query param the landing page's "Apply
    -- Now" link always includes, or the current site's own slug as a
    -- fallback — see AdmissionPage.jsx), and admissionService.apply() now
    -- requires that slug to resolve to a real, active tenant. So, same as
    -- notices/gallery_items above, tenant_id can finally be tightened to
    -- NOT NULL instead of silently accepting untraceable applications.
    ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE admission_applications SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;
    ALTER TABLE admission_applications ALTER COLUMN tenant_id SET NOT NULL;

    -- Academic restructure: exams become first-class records (name/term/session
    -- live on "exams"; per-class-per-subject rows on exam_schedules link to
    -- them). exam_name stays on exam_schedules, synced from the parent exam, so
    -- portal/report readers keep working. Backfill groups legacy rows by name.
    ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE;
    INSERT INTO exams (id, tenant_id, name)
      SELECT 'exam-' || md5(tenant_id || '|' || exam_name), tenant_id, exam_name
        FROM (SELECT DISTINCT tenant_id, exam_name FROM exam_schedules WHERE exam_id IS NULL) legacy
      ON CONFLICT (id) DO NOTHING;
    UPDATE exam_schedules
       SET exam_id = 'exam-' || md5(tenant_id || '|' || exam_name)
     WHERE exam_id IS NULL;

    -- Classes link to an academic session; academic_year stays as a display
    -- string synced from the session name for existing consumers.
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES academic_sessions(id) ON DELETE SET NULL;
    UPDATE classes c SET session_id = s.id
      FROM academic_sessions s
     WHERE c.session_id IS NULL AND s.tenant_id = c.tenant_id AND s.name = c.academic_year;

    -- Class-wise fee rules + accounting ledger additions.
    ALTER TABLE fee_categories ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE fee_invoices   ADD COLUMN IF NOT EXISTS fine_applied BOOLEAN NOT NULL DEFAULT false;

    -- Salary payments now record how they were actually paid (cash/bank/...)
    -- instead of always being posted to the ledger as 'bank'.
    ALTER TABLE staff_payroll_records ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'cash';

    -- Teachers are paid through the same salary-payment flow as non-teaching
    -- staff, but live in a separate table (teacher_profiles), so a payroll
    -- record now points at exactly one of staff_id / teacher_id.
    ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE staff_payroll_records ALTER COLUMN staff_id DROP NOT NULL;
    ALTER TABLE staff_payroll_records ADD COLUMN IF NOT EXISTS teacher_id TEXT REFERENCES teacher_profiles(id) ON DELETE CASCADE;

    -- Lets ID cards / admit cards show a real photo instead of a placeholder box.
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

    -- Messaging used one fixed column per role (guardian/teacher/admin_user_id),
    -- so a thread could only ever hold one participant of each of those three
    -- roles — no same-role pairs, no student/accountant participants at all.
    -- Generic two-participant columns replace that going forward; the old
    -- columns are kept (unused) rather than dropped.
    ALTER TABLE communication_threads ADD COLUMN IF NOT EXISTS participant_one_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE communication_threads ADD COLUMN IF NOT EXISTS participant_two_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

    -- Group chat: a thread can now hold 3+ people. participant_one/two stay
    -- populated (first two members) for cheap display fallbacks, but access
    -- control and membership always go through communication_thread_participants.
    ALTER TABLE communication_threads ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE communication_messages ALTER COLUMN recipient_user_id DROP NOT NULL;

    -- Backfill the new participants table from every existing thread's
    -- legacy two-column model so it's queryable through one path immediately.
    INSERT INTO communication_thread_participants (id, thread_id, user_id)
      SELECT 'ctp-' || md5(ct.id || '|' || ct.participant_one_user_id), ct.id, ct.participant_one_user_id
        FROM communication_threads ct
       WHERE ct.participant_one_user_id IS NOT NULL
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    INSERT INTO communication_thread_participants (id, thread_id, user_id)
      SELECT 'ctp-' || md5(ct.id || '|' || ct.participant_two_user_id), ct.id, ct.participant_two_user_id
        FROM communication_threads ct
       WHERE ct.participant_two_user_id IS NOT NULL
      ON CONFLICT (thread_id, user_id) DO NOTHING;

    -- Messages can carry one file attachment (PDF/image/text/Word) instead of,
    -- or alongside, body text. Stored on /uploads like gallery photos rather
    -- than through the authenticated admission-document flow, since a message
    -- is already only visible to its two participants (+ admin) via the
    -- thread access check — the file URL itself is just an unguessable path.
    ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
    ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
    ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT;
    ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

    -- Edit/soft-delete: deleted messages keep their row (so unread counts,
    -- ordering, and "N messages in thread" stay correct) but the body and
    -- attachment are cleared and the API returns a tombstone instead.
    ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
    ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    UPDATE communication_threads
       SET participant_one_user_id = COALESCE(guardian_user_id, teacher_user_id, admin_user_id),
           participant_two_user_id = (
             SELECT x FROM (VALUES (guardian_user_id),(teacher_user_id),(admin_user_id)) AS v(x)
             WHERE x IS NOT NULL AND x != COALESCE(guardian_user_id, teacher_user_id, admin_user_id)
             LIMIT 1
           )
     WHERE participant_one_user_id IS NULL;

    -- Backfill the new cash-book ledger from existing fee payments, expenses,
    -- and paid payroll records so it isn't empty on rollout.
    INSERT INTO finance_transactions (id, tenant_id, direction, source_type, source_id, amount, method, category, transaction_date, recorded_by, notes, created_at)
      SELECT 'fintx-' || fp.id, fp.tenant_id, 'in', 'fee_payment', fp.id, fp.amount, fp.method, 'Fee Payment', fp.payment_date, fp.collected_by, fp.notes, fp.created_at
        FROM fee_payments fp
      ON CONFLICT (source_type, source_id) DO NOTHING;

    INSERT INTO finance_transactions (id, tenant_id, direction, source_type, source_id, amount, method, category, transaction_date, recorded_by, notes, created_at)
      SELECT 'fintx-' || e.id, e.tenant_id, 'out', 'expense', e.id, e.amount, e.method, e.category, e.expense_date, e.created_by, e.notes, e.created_at
        FROM expenses e
      ON CONFLICT (source_type, source_id) DO NOTHING;

    -- Uses the payroll record's own method column (cash/bank/bkash/...)
    -- instead of hardcoding 'bank' for every salary payment regardless of
    -- how it was actually paid.
    INSERT INTO finance_transactions (id, tenant_id, direction, source_type, source_id, amount, method, category, transaction_date, recorded_by, notes, created_at)
      SELECT 'fintx-' || pr.id, pr.tenant_id, 'out', 'payroll', pr.id, pr.net_salary, pr.method, 'Staff Payroll', COALESCE(pr.paid_at, pr.period || '-01'), NULL, pr.notes, pr.created_at
        FROM staff_payroll_records pr
       WHERE pr.status = 'paid'
      ON CONFLICT (source_type, source_id) DO NOTHING;

    -- Ledger rows created before this fix always say 'bank' regardless of
    -- the payroll record's real method; correct any that now disagree.
    UPDATE finance_transactions ft
       SET method = pr.method
      FROM staff_payroll_records pr
     WHERE ft.source_type = 'payroll' AND ft.source_id = pr.id AND ft.method IS DISTINCT FROM pr.method;

    -- Donations were missing from the ledger backfill entirely (only
    -- fee_payments/expenses/payroll were covered), even though the live
    -- "record a donation" flow already posts to finance_transactions itself.
    INSERT INTO finance_transactions (id, tenant_id, direction, source_type, source_id, amount, method, category, transaction_date, recorded_by, notes, created_at)
      SELECT 'fintx-' || d.id, d.tenant_id, 'in', 'donation', d.id, d.amount, d.method,
             CASE WHEN d.donor_name != '' THEN 'Donation — ' || d.donor_name ELSE 'Donation' END,
             d.donation_date, d.received_by, d.notes, d.created_at
        FROM donations d
      ON CONFLICT (source_type, source_id) DO NOTHING;
  `);

  // Stage 3 â€” create indexes (all referenced columns now guaranteed to exist)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant
      ON users(email, COALESCE(tenant_id, ''));

    CREATE INDEX IF NOT EXISTS idx_tenants_slug               ON tenants(slug);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash   ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id      ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_document_issuances_code    ON document_issuances(verify_code);
    CREATE INDEX IF NOT EXISTS idx_document_issuances_student ON document_issuances(student_user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_classes_tenant_id          ON classes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_class_routines_class_id    ON class_routines(class_id);
    CREATE INDEX IF NOT EXISTS idx_subjects_tenant            ON subjects(tenant_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_teacher_subject_class      ON teacher_subject_assignments(teacher_id, class_id);
    CREATE INDEX IF NOT EXISTS idx_student_movements_student  ON student_academic_movements(student_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_syllabus_entries_class_id  ON syllabus_entries(class_id);
    CREATE INDEX IF NOT EXISTS idx_exam_schedules_class_id    ON exam_schedules(class_id);
    CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_date   ON exam_schedules(exam_date);
    CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_id     ON exam_schedules(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exams_tenant_session       ON exams(tenant_id, session_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_classes_session            ON classes(session_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_exam_schedule_id ON exam_results(exam_schedule_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_student_user_id  ON exam_results(student_user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_period ON attendance_records(class_id, student_user_id, attendance_date, period_number);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date      ON attendance_records(class_id, attendance_date, period_number);
    CREATE INDEX IF NOT EXISTS idx_attendance_student         ON attendance_records(student_user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_correction_requests(tenant_id, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_student_profiles_tenant_id ON student_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id   ON student_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_student_profiles_class_id  ON student_profiles(class_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_tenant_id ON teacher_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id   ON teacher_profiles(user_id);

    CREATE INDEX IF NOT EXISTS idx_guardian_students_guardian ON guardian_students(guardian_user_id);
    CREATE INDEX IF NOT EXISTS idx_guardian_students_student  ON guardian_students(student_user_id);

    CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(is_published, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notices_type      ON notices(type);
    CREATE INDEX IF NOT EXISTS idx_notices_tenant     ON notices(tenant_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_gallery_items_sort   ON gallery_items(sort_order, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_gallery_items_tenant ON gallery_items(tenant_id);

    CREATE INDEX IF NOT EXISTS idx_admission_applications_reference ON admission_applications(reference_code);
    CREATE INDEX IF NOT EXISTS idx_admission_applications_tenant    ON admission_applications(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admission_applications_status    ON admission_applications(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admission_documents_application ON admission_documents(application_id, document_type);
    CREATE INDEX IF NOT EXISTS idx_admission_documents_status      ON admission_documents(verification_status, uploaded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fee_categories_tenant     ON fee_categories(tenant_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant     ON fee_structures(tenant_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_fee_structures_class      ON fee_structures(class_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_structures_tenant_category_allclasses
      ON fee_structures(tenant_id, category_id) WHERE class_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_fee_assignments_student   ON fee_assignments(student_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_fee_assignments_category  ON fee_assignments(category_id);
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_tenant       ON fee_invoices(tenant_id, status, period);
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_student      ON fee_invoices(student_user_id, period);
    CREATE INDEX IF NOT EXISTS idx_fee_invoice_items_invoice ON fee_invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice      ON fee_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_student      ON fee_payments(student_user_id, payment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date      ON expenses(tenant_id, expense_date DESC);
    CREATE INDEX IF NOT EXISTS idx_donations_tenant_date     ON donations(tenant_id, donation_date DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_payroll_teacher_period ON staff_payroll_records(teacher_id, period);
    CREATE INDEX IF NOT EXISTS idx_comm_threads_participant_one ON communication_threads(tenant_id, participant_one_user_id);
    CREATE INDEX IF NOT EXISTS idx_comm_threads_participant_two ON communication_threads(tenant_id, participant_two_user_id);
    CREATE INDEX IF NOT EXISTS idx_finance_tx_tenant_date    ON finance_transactions(tenant_id, transaction_date DESC);
    CREATE INDEX IF NOT EXISTS idx_finance_tx_source         ON finance_transactions(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant    ON staff_profiles(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_date    ON staff_attendance(tenant_id, attendance_date DESC);
    CREATE INDEX IF NOT EXISTS idx_staff_leave_status      ON staff_leave_requests(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_staff_payroll_period    ON staff_payroll_records(tenant_id, period);
    CREATE INDEX IF NOT EXISTS idx_comm_threads_tenant       ON communication_threads(tenant_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comm_messages_thread      ON communication_messages(thread_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_comm_messages_recipient   ON communication_messages(recipient_user_id, read_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comm_thread_participants_thread ON communication_thread_participants(thread_id);
    CREATE INDEX IF NOT EXISTS idx_comm_thread_participants_user   ON communication_thread_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_comm_message_reads_message ON communication_message_reads(message_id);
    CREATE INDEX IF NOT EXISTS idx_comm_message_reads_user    ON communication_message_reads(user_id);
  `);
}




