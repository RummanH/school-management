export class AdminController {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  getStats = async (_req, res, next) => {
    try {
      const result = await this.databaseManager.withClient((client) =>
        client.query(`
          SELECT
            COUNT(*)::int                                          AS total,
            COUNT(*) FILTER (WHERE status = 'NEW')::int           AS new_count,
            COUNT(*) FILTER (WHERE status = 'READ')::int          AS read_count,
            COUNT(*) FILTER (WHERE status = 'RESOLVED')::int      AS resolved_count
          FROM contact_messages
        `),
      );
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  };

  getReports = async (req, res, next) => {
    try {
      const tenantId = req.currentUser?.tenantId || null;
      const today = String(req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const month = String(req.query.month || today.slice(0, 7)).slice(0, 7);

      const report = await this.databaseManager.withClient(async (client) => {
        const overview = await client.query(
            `SELECT
               COUNT(*) FILTER (WHERE role = 'student' AND status = 'active')::int AS active_students,
               COUNT(*) FILTER (WHERE role = 'teacher' AND status = 'active')::int AS total_teachers
             FROM users
             WHERE ($1::text IS NULL OR tenant_id = $1)`,
            [tenantId],
          );
        const classCounts = await client.query(
            `SELECT
               c.id,
               c.name,
               c.section,
               c.academic_year,
               COUNT(DISTINCT u.id)::int AS student_count
             FROM classes c
             LEFT JOIN student_profiles sp
               ON sp.tenant_id = c.tenant_id
              AND (
                sp.class_id = c.id
                OR (sp.class_id IS NULL AND LOWER(sp.class_name) = LOWER(c.name) AND COALESCE(sp.section, '') = COALESCE(c.section, ''))
              )
             LEFT JOIN users u ON u.id = sp.user_id AND u.role = 'student' AND u.status = 'active'
             WHERE ($1::text IS NULL OR c.tenant_id = $1)
             GROUP BY c.id, c.name, c.section, c.academic_year
             ORDER BY c.name ASC, c.section ASC`,
            [tenantId],
          );
        const genderCounts = await client.query(
            `SELECT
               COALESCE(NULLIF(LOWER(TRIM(sp.gender)), ''), 'unspecified') AS gender,
               COUNT(*)::int AS student_count
             FROM student_profiles sp
             JOIN users u ON u.id = sp.user_id AND u.role = 'student' AND u.status = 'active'
             WHERE ($1::text IS NULL OR sp.tenant_id = $1)
             GROUP BY COALESCE(NULLIF(LOWER(TRIM(sp.gender)), ''), 'unspecified')
             ORDER BY student_count DESC, gender ASC`,
            [tenantId],
          );
        const attendance = await client.query(
            `SELECT
               COUNT(*) FILTER (WHERE attendance_date = $2)::int AS daily_total,
               COUNT(*) FILTER (WHERE attendance_date = $2 AND status = 'present')::int AS daily_present,
               COUNT(*) FILTER (WHERE attendance_date >= $3 || '-01' AND attendance_date < ((($3 || '-01')::date + INTERVAL '1 month')::date)::text)::int AS monthly_total,
               COUNT(*) FILTER (WHERE attendance_date >= $3 || '-01' AND attendance_date < ((($3 || '-01')::date + INTERVAL '1 month')::date)::text AND status = 'present')::int AS monthly_present
             FROM attendance_records
             WHERE ($1::text IS NULL OR tenant_id = $1)`,
            [tenantId, today, month],
          );
        const absentStudents = await client.query(
            `SELECT
               ar.student_user_id,
               u.name AS student_name,
               sp.roll_number,
               COALESCE(c.name, sp.class_name, '') AS class_name,
               COALESCE(c.section, sp.section, '') AS section,
               ar.note
             FROM attendance_records ar
             JOIN users u ON u.id = ar.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = ar.student_user_id
             LEFT JOIN classes c ON c.id = ar.class_id
             WHERE ar.attendance_date = $2
               AND ar.status = 'absent'
               AND ($1::text IS NULL OR ar.tenant_id = $1)
             ORDER BY class_name ASC, section ASC, sp.roll_number ASC, u.name ASC
             LIMIT 100`,
            [tenantId, today],
          );
        const examSummary = await client.query(
            `SELECT
               COUNT(er.id)::int AS results_recorded,
               COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL AND er.marks_obtained >= (es.total_marks * 0.33))::int AS passed,
               COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL AND er.marks_obtained < (es.total_marks * 0.33))::int AS failed,
               ROUND(100.0 * COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL AND er.marks_obtained >= (es.total_marks * 0.33)) / NULLIF(COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL), 0), 2) AS pass_rate
             FROM exam_results er
             JOIN exam_schedules es ON es.id = er.exam_schedule_id
             WHERE ($1::text IS NULL OR er.tenant_id = $1)`,
            [tenantId],
          );
        const classResults = await client.query(
            `SELECT
               c.id AS class_id,
               c.name AS class_name,
               c.section,
               COUNT(er.id)::int AS results_recorded,
               ROUND(AVG(er.marks_obtained), 2) AS average_marks,
               COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL AND er.marks_obtained >= (es.total_marks * 0.33))::int AS passed,
               COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL AND er.marks_obtained < (es.total_marks * 0.33))::int AS failed,
               ROUND(100.0 * COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL AND er.marks_obtained >= (es.total_marks * 0.33)) / NULLIF(COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL), 0), 2) AS pass_rate
             FROM classes c
             LEFT JOIN exam_schedules es ON es.class_id = c.id
             LEFT JOIN exam_results er ON er.exam_schedule_id = es.id
             WHERE ($1::text IS NULL OR c.tenant_id = $1)
             GROUP BY c.id, c.name, c.section
             ORDER BY c.name ASC, c.section ASC`,
            [tenantId],
          );
        const admissions = await client.query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
               COUNT(*) FILTER (WHERE status = 'under_review')::int AS under_review,
               COUNT(*) FILTER (WHERE status = 'test_scheduled')::int AS test_scheduled,
               COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
               COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30_days
             FROM admission_applications`,
          );
        const fees = await client.query(
            `SELECT
               COALESCE(SUM(total_amount), 0) AS billed,
               COALESCE(SUM(paid_amount), 0) AS collected,
               COALESCE(SUM(total_amount - paid_amount), 0) AS due,
               COUNT(*)::int AS invoice_count,
               COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
               COUNT(*) FILTER (WHERE status = 'partial')::int AS partial_count,
               COUNT(*) FILTER (WHERE status = 'unpaid')::int AS unpaid_count
             FROM fee_invoices
             WHERE ($1::text IS NULL OR tenant_id = $1)`,
            [tenantId],
          );

        const attendanceRow = attendance.rows[0] || {};
        const dailyTotal = Number(attendanceRow.daily_total || 0);
        const dailyPresent = Number(attendanceRow.daily_present || 0);
        const monthlyTotal = Number(attendanceRow.monthly_total || 0);
        const monthlyPresent = Number(attendanceRow.monthly_present || 0);

        return {
          filters: { date: today, month },
          overview: {
            activeStudents: Number(overview.rows[0]?.active_students || 0),
            totalTeachers: Number(overview.rows[0]?.total_teachers || 0),
          },
          classWiseStudents: classCounts.rows.map((row) => ({
            id: row.id,
            name: row.name,
            section: row.section,
            academicYear: row.academic_year,
            studentCount: Number(row.student_count || 0),
          })),
          genderWiseStudents: genderCounts.rows.map((row) => ({
            gender: row.gender,
            studentCount: Number(row.student_count || 0),
          })),
          attendance: {
            date: today,
            month,
            dailyTotal,
            dailyPresent,
            dailyPercentage: percent(dailyPresent, dailyTotal),
            monthlyTotal,
            monthlyPresent,
            monthlyPercentage: percent(monthlyPresent, monthlyTotal),
          },
          absentStudents: absentStudents.rows.map((row) => ({
            studentUserId: row.student_user_id,
            studentName: row.student_name,
            rollNumber: row.roll_number,
            className: row.class_name,
            section: row.section,
            note: row.note,
          })),
          exams: {
            resultsRecorded: Number(examSummary.rows[0]?.results_recorded || 0),
            passed: Number(examSummary.rows[0]?.passed || 0),
            failed: Number(examSummary.rows[0]?.failed || 0),
            passRate: Number(examSummary.rows[0]?.pass_rate || 0),
          },
          classWiseResults: classResults.rows.map((row) => ({
            classId: row.class_id,
            className: row.class_name,
            section: row.section,
            resultsRecorded: Number(row.results_recorded || 0),
            averageMarks: Number(row.average_marks || 0),
            passed: Number(row.passed || 0),
            failed: Number(row.failed || 0),
            passRate: Number(row.pass_rate || 0),
          })),
          admissions: {
            total: Number(admissions.rows[0]?.total || 0),
            submitted: Number(admissions.rows[0]?.submitted || 0),
            underReview: Number(admissions.rows[0]?.under_review || 0),
            testScheduled: Number(admissions.rows[0]?.test_scheduled || 0),
            accepted: Number(admissions.rows[0]?.accepted || 0),
            rejected: Number(admissions.rows[0]?.rejected || 0),
            last30Days: Number(admissions.rows[0]?.last_30_days || 0),
          },
          fees: {
            billed: money(fees.rows[0]?.billed),
            collected: money(fees.rows[0]?.collected),
            due: money(fees.rows[0]?.due),
            invoiceCount: Number(fees.rows[0]?.invoice_count || 0),
            paidCount: Number(fees.rows[0]?.paid_count || 0),
            partialCount: Number(fees.rows[0]?.partial_count || 0),
            unpaidCount: Number(fees.rows[0]?.unpaid_count || 0),
          },
        };
      });

      res.json({ report });
    } catch (error) {
      next(error);
    }
  };

  getContacts = async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const status = req.query.status || null;

      const result = await this.databaseManager.withClient((client) =>
        client.query(
          `SELECT * FROM contact_messages
           WHERE ($1::text IS NULL OR status = $1)
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [status, limit, offset],
        ),
      );
      res.json({ contacts: result.rows });
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req, res, next) => {
    try {
      await this.databaseManager.withTransaction((client) =>
        client.query(
          "UPDATE contact_messages SET status = 'READ' WHERE id = $1",
          [req.params.id],
        ),
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}

function percent(value, total) {
  return total > 0 ? Number(((Number(value || 0) / total) * 100).toFixed(2)) : 0;
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}
