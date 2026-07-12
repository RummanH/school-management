export class AdminController {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  getDashboardOverview = async (req, res, next) => {
    try {
      if (!DASHBOARD_ROLES.has(req.currentUser?.role)) {
        return res.status(403).json({ message: "You do not have permission to view the dashboard overview." });
      }

      const tenantId = req.currentUser?.tenantId || null;
      const today = String(req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const month = String(req.query.month || today.slice(0, 7)).slice(0, 7);
      const monthStart = `${month}-01`;
      const nextMonthStart = addMonths(monthStart, 1);
      const weekday = new Date(`${today}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
      const upcomingUntil = addDays(today, 7);
      const role = req.currentUser?.role || "";
      const userId = req.currentUser?.id || null;

      const overview = await this.databaseManager.withClient(async (client) => {
        const [population, attendance, fees, schedule, notices, attention, performance, finance, contactStats, contacts] = await Promise.all([
          client.query(
            `SELECT
               COUNT(*) FILTER (WHERE u.role = 'student' AND u.status = 'active')::int AS student_count,
               COUNT(*) FILTER (WHERE u.role = 'teacher' AND u.status = 'active')::int AS teacher_count,
               (SELECT COUNT(*)::int FROM classes c WHERE ($1::text IS NULL OR c.tenant_id = $1)) AS class_count,
               (SELECT COUNT(*)::int FROM notices n WHERE n.is_published = true AND ($1::text IS NULL OR n.tenant_id = $1)) AS published_notice_count
             FROM users u
             WHERE ($1::text IS NULL OR u.tenant_id = $1)`,
            [tenantId],
          ),
          client.query(
            `SELECT
               COUNT(*)::int AS total_count,
               COUNT(*) FILTER (WHERE status <> 'absent')::int AS present_count,
               COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_count
             FROM attendance_records
             WHERE ($1::text IS NULL OR tenant_id = $1)
               AND attendance_date = $2`,
            [tenantId, today],
          ),
          client.query(
            `SELECT
               COALESCE(SUM(GREATEST(total_amount - paid_amount, 0)), 0) AS outstanding_amount,
               COUNT(*) FILTER (
                 WHERE GREATEST(total_amount - paid_amount, 0) > 0
                   AND COALESCE(NULLIF(due_date, ''), period || '-28') < $2
               )::int AS overdue_invoice_count,
               COALESCE(
                 SUM(GREATEST(total_amount - paid_amount, 0)) FILTER (
                   WHERE GREATEST(total_amount - paid_amount, 0) > 0
                     AND COALESCE(NULLIF(due_date, ''), period || '-28') < $2
                 ),
                 0
               ) AS overdue_amount
             FROM fee_invoices
             WHERE ($1::text IS NULL OR tenant_id = $1)`,
            [tenantId, today],
          ),
          client.query(
            `SELECT
               cr.id,
               cr.subject,
               cr.start_time,
               cr.end_time,
               cr.period_number,
               cr.room,
               c.name AS class_name,
               c.section,
               COALESCE(u.name, '') AS teacher_name
             FROM class_routines cr
             JOIN classes c ON c.id = cr.class_id
             LEFT JOIN users u ON u.id = cr.teacher_id
             WHERE ($1::text IS NULL OR cr.tenant_id = $1)
               AND cr.day_of_week = $2
               AND ($3::text <> 'teacher' OR cr.teacher_id = $4)
             ORDER BY NULLIF(cr.start_time, '') ASC NULLS LAST, cr.period_number ASC, c.name ASC, c.section ASC
             LIMIT 8`,
            [tenantId, weekday, role, userId],
          ),
          client.query(
            `SELECT
               n.id,
               n.title,
               n.type,
               n.audience,
               COALESCE(n.published_at, n.created_at) AS published_at,
               COALESCE(u.name, 'System') AS author_name
             FROM notices n
             LEFT JOIN users u ON u.id = n.created_by
             WHERE n.is_published = true
               AND ($1::text IS NULL OR n.tenant_id = $1)
             ORDER BY COALESCE(n.published_at, n.created_at) DESC
             LIMIT 4`,
            [tenantId],
          ),
          client.query(
            `SELECT
               (
                 SELECT COUNT(*)::int
                 FROM (
                   SELECT ar.student_user_id
                   FROM attendance_records ar
                   WHERE ($1::text IS NULL OR ar.tenant_id = $1)
                     AND ar.attendance_date >= $2
                     AND ar.attendance_date < $3
                   GROUP BY ar.student_user_id
                   HAVING (100.0 * COUNT(*) FILTER (WHERE ar.status <> 'absent') / NULLIF(COUNT(*), 0)) < 80
                 ) low_attendance
               ) AS low_attendance_count,
               (
                 SELECT COUNT(*)::int
                 FROM staff_leave_requests sl
                 WHERE ($1::text IS NULL OR sl.tenant_id = $1)
                   AND sl.status = 'pending'
               ) AS pending_leave_count,
               (
                 SELECT COUNT(*)::int
                 FROM attendance_correction_requests acr
                 WHERE ($1::text IS NULL OR acr.tenant_id = $1)
                   AND acr.status = 'pending'
               ) AS pending_correction_count,
               (
                 SELECT COUNT(*)::int
                 FROM exam_schedules es
                 WHERE ($1::text IS NULL OR es.tenant_id = $1)
                   AND es.exam_date >= $4
                   AND es.exam_date <= $5
               ) AS upcoming_exam_count`,
            [tenantId, monthStart, nextMonthStart, today, upcomingUntil],
          ),
          client.query(
            `SELECT
               c.id AS class_id,
               c.name AS class_name,
               c.section,
               COALESCE(st.student_count, 0)::int AS student_count,
               COALESCE(att.attendance_pct, 0) AS attendance_pct,
               COALESCE(ex.avg_marks, 0) AS average_marks,
               COALESCE(ex.pass_rate, 0) AS pass_rate
             FROM classes c
             LEFT JOIN LATERAL (
               SELECT COUNT(DISTINCT sp.user_id)::int AS student_count
               FROM student_profiles sp
               JOIN users u ON u.id = sp.user_id AND u.role = 'student' AND u.status = 'active'
               WHERE sp.tenant_id = c.tenant_id
                 AND (
                   sp.class_id = c.id
                   OR (
                     sp.class_id IS NULL
                     AND LOWER(sp.class_name) = LOWER(c.name)
                     AND COALESCE(sp.section, '') = COALESCE(c.section, '')
                   )
                 )
             ) st ON TRUE
             LEFT JOIN LATERAL (
               SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ar.status <> 'absent') / NULLIF(COUNT(*), 0), 1) AS attendance_pct
               FROM attendance_records ar
               WHERE ar.class_id = c.id
                 AND ar.attendance_date >= $2
                 AND ar.attendance_date < $3
             ) att ON TRUE
             LEFT JOIN LATERAL (
               SELECT
                 ROUND(AVG(er.marks_obtained), 1) AS avg_marks,
                 ROUND(
                   100.0 * COUNT(er.id) FILTER (
                     WHERE er.marks_obtained IS NOT NULL
                       AND er.marks_obtained >= (es.total_marks * 0.33)
                   ) / NULLIF(COUNT(er.id) FILTER (WHERE er.marks_obtained IS NOT NULL), 0),
                   1
                 ) AS pass_rate
               FROM exam_schedules es
               LEFT JOIN exam_results er ON er.exam_schedule_id = es.id
               WHERE es.class_id = c.id
             ) ex ON TRUE
             WHERE ($1::text IS NULL OR c.tenant_id = $1)
             ORDER BY COALESCE(ex.avg_marks, -1) DESC, COALESCE(att.attendance_pct, -1) DESC, c.name ASC, c.section ASC
             LIMIT 6`,
            [tenantId, monthStart, nextMonthStart],
          ),
          client.query(
            `SELECT
               (
                 SELECT COALESCE(SUM(fp.amount), 0)
                 FROM fee_payments fp
                 WHERE ($1::text IS NULL OR fp.tenant_id = $1)
                   AND fp.payment_date >= $2
                   AND fp.payment_date < $3
               ) AS collected_this_month,
               (
                 SELECT COALESCE(SUM(e.amount), 0)
                 FROM expenses e
                 WHERE ($1::text IS NULL OR e.tenant_id = $1)
                   AND e.expense_date >= $2
                   AND e.expense_date < $3
               ) AS expenses_this_month,
               (
                 SELECT COALESCE(SUM(CASE WHEN ft.direction = 'in' THEN ft.amount ELSE -ft.amount END), 0)
                 FROM finance_transactions ft
                 WHERE ($1::text IS NULL OR ft.tenant_id = $1)
               ) AS balance`,
            [tenantId, monthStart, nextMonthStart],
          ),
          client.query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'NEW')::int AS new_count,
               COUNT(*) FILTER (WHERE status = 'READ')::int AS read_count,
               COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved_count
             FROM contact_messages`,
          ),
          client.query(
            `SELECT *
             FROM contact_messages
             ORDER BY created_at DESC
             LIMIT 10`,
          ),
        ]);

        const populationRow = population.rows[0] || {};
        const attendanceRow = attendance.rows[0] || {};
        const feesRow = fees.rows[0] || {};
        const attentionRow = attention.rows[0] || {};
        const financeRow = finance.rows[0] || {};
        const contactStatsRow = contactStats.rows[0] || {};

        const attendanceTotal = Number(attendanceRow.total_count || 0);
        const attendancePresent = Number(attendanceRow.present_count || 0);

        return {
          generatedAt: new Date().toISOString(),
          filters: {
            date: today,
            month,
            weekday,
          },
          summary: {
            studentCount: Number(populationRow.student_count || 0),
            teacherCount: Number(populationRow.teacher_count || 0),
            classCount: Number(populationRow.class_count || 0),
            publishedNoticeCount: Number(populationRow.published_notice_count || 0),
            attendanceToday: {
              total: attendanceTotal,
              present: attendancePresent,
              absent: Number(attendanceRow.absent_count || 0),
              percentage: percent(attendancePresent, attendanceTotal),
            },
            fees: {
              outstandingAmount: money(feesRow.outstanding_amount),
              overdueInvoiceCount: Number(feesRow.overdue_invoice_count || 0),
              overdueAmount: money(feesRow.overdue_amount),
            },
            upcomingExamCount: Number(attentionRow.upcoming_exam_count || 0),
          },
          schedule: schedule.rows.map((row) => ({
            id: row.id,
            subject: row.subject,
            startTime: row.start_time || '',
            endTime: row.end_time || '',
            periodNumber: Number(row.period_number || 0),
            room: row.room || '',
            className: row.class_name || '',
            section: row.section || '',
            teacherName: row.teacher_name || '',
          })),
          announcements: notices.rows.map((row) => ({
            id: row.id,
            title: row.title,
            type: row.type,
            audience: row.audience,
            publishedAt: row.published_at,
            authorName: row.author_name,
          })),
          attention: {
            lowAttendanceCount: Number(attentionRow.low_attendance_count || 0),
            pendingLeaveCount: Number(attentionRow.pending_leave_count || 0),
            pendingCorrectionCount: Number(attentionRow.pending_correction_count || 0),
          },
          performance: performance.rows.map((row) => ({
            classId: row.class_id,
            className: row.class_name,
            section: row.section || '',
            studentCount: Number(row.student_count || 0),
            attendancePct: Number(row.attendance_pct || 0),
            averageMarks: Number(row.average_marks || 0),
            passRate: Number(row.pass_rate || 0),
          })),
          finance: {
            collectedThisMonth: money(financeRow.collected_this_month),
            expensesThisMonth: money(financeRow.expenses_this_month),
            balance: money(financeRow.balance),
          },
          contacts: {
            stats: {
              total: Number(contactStatsRow.total || 0),
              newCount: Number(contactStatsRow.new_count || 0),
              readCount: Number(contactStatsRow.read_count || 0),
              resolvedCount: Number(contactStatsRow.resolved_count || 0),
            },
            items: contacts.rows,
          },
        };
      });

      res.json({ overview });
    } catch (error) {
      next(error);
    }
  };

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

const DASHBOARD_ROLES = new Set(["system_developer", "admin", "teacher", "accountant"]);

function percent(value, total) {
  return total > 0 ? Number(((Number(value || 0) / total) * 100).toFixed(2)) : 0;
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(isoDate, months) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}
