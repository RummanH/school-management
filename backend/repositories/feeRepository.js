export function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function mapMoney(row, key) { return toMoney(row[key]); }

export function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || '',
    defaultAmount: mapMoney(row, 'default_amount'),
    billingCycle: row.billing_cycle,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name || '',
    className: row.class_name || '',
    section: row.section || '',
    rollNumber: row.roll_number || '',
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    amount: mapMoney(row, 'amount'),
    discountAmount: mapMoney(row, 'discount_amount'),
    waiverAmount: mapMoney(row, 'waiver_amount'),
    scholarshipAmount: mapMoney(row, 'scholarship_amount'),
    fineAmount: mapMoney(row, 'fine_amount'),
    netAmount: toMoney(row.net_amount ?? (Number(row.amount || 0) + Number(row.fine_amount || 0) - Number(row.discount_amount || 0) - Number(row.waiver_amount || 0) - Number(row.scholarship_amount || 0))),
    startPeriod: row.start_period || '',
    endPeriod: row.end_period || '',
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name || '',
    className: row.class_name || '',
    section: row.section || '',
    rollNumber: row.roll_number || '',
    period: row.period,
    title: row.title,
    dueDate: row.due_date,
    subtotalAmount: mapMoney(row, 'subtotal_amount'),
    discountAmount: mapMoney(row, 'discount_amount'),
    waiverAmount: mapMoney(row, 'waiver_amount'),
    scholarshipAmount: mapMoney(row, 'scholarship_amount'),
    fineAmount: mapMoney(row, 'fine_amount'),
    totalAmount: mapMoney(row, 'total_amount'),
    paidAmount: mapMoney(row, 'paid_amount'),
    dueAmount: toMoney(row.due_amount ?? (Number(row.total_amount || 0) - Number(row.paid_amount || 0))),
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInvoiceItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    categoryId: row.category_id,
    assignmentId: row.assignment_id,
    description: row.description,
    amount: mapMoney(row, 'amount'),
    discountAmount: mapMoney(row, 'discount_amount'),
    waiverAmount: mapMoney(row, 'waiver_amount'),
    scholarshipAmount: mapMoney(row, 'scholarship_amount'),
    fineAmount: mapMoney(row, 'fine_amount'),
    totalAmount: mapMoney(row, 'total_amount'),
  };
}

export function mapPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name || '',
    receiptNumber: row.receipt_number,
    amount: mapMoney(row, 'amount'),
    method: row.method,
    paymentDate: row.payment_date,
    referenceNo: row.reference_no || '',
    notes: row.notes || '',
    collectedBy: row.collected_by,
    createdAt: row.created_at,
  };
}

export function mapExpense(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    amount: mapMoney(row, 'amount'),
    expenseDate: row.expense_date,
    payee: row.payee || '',
    method: row.method,
    referenceNo: row.reference_no || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const invoiceSelect = `fi.*, u.name AS student_name, sp.class_name, sp.section, sp.roll_number,
  (fi.total_amount - fi.paid_amount) AS due_amount`;

export async function listCategories(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM fee_categories WHERE tenant_id = $1 ORDER BY is_active DESC, name ASC`,
    [tenantId],
  );
  return result.rows.map(mapCategory);
}

export async function findCategoryById(client, id) {
  const result = await client.query(`SELECT * FROM fee_categories WHERE id = $1 LIMIT 1`, [id]);
  return mapCategory(result.rows[0]);
}

export async function insertCategory(client, data) {
  const result = await client.query(
    `INSERT INTO fee_categories (id, tenant_id, name, description, default_amount, billing_cycle, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.id, data.tenantId, data.name, data.description || '', data.defaultAmount, data.billingCycle, data.isActive],
  );
  return mapCategory(result.rows[0]);
}

export async function updateCategory(client, data) {
  const result = await client.query(
    `UPDATE fee_categories SET name=$2, description=$3, default_amount=$4, billing_cycle=$5,
            is_active=$6, updated_at=NOW()
      WHERE id=$1 RETURNING *`,
    [data.id, data.name, data.description || '', data.defaultAmount, data.billingCycle, data.isActive],
  );
  return mapCategory(result.rows[0]);
}

export async function deleteCategory(client, id) {
  await client.query(`DELETE FROM fee_categories WHERE id = $1`, [id]);
}

export async function listAssignments(client, tenantId, studentUserId = null) {
  const result = await client.query(
    `SELECT fa.*, fc.name AS category_name, u.name AS student_name, sp.class_name, sp.section, sp.roll_number,
            (fa.amount + fa.fine_amount - fa.discount_amount - fa.waiver_amount - fa.scholarship_amount) AS net_amount
       FROM fee_assignments fa
       JOIN fee_categories fc ON fc.id = fa.category_id
       JOIN users u ON u.id = fa.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = fa.student_user_id
      WHERE fa.tenant_id = $1 AND ($2::text IS NULL OR fa.student_user_id = $2)
      ORDER BY u.name ASC, fc.name ASC`,
    [tenantId, studentUserId],
  );
  return result.rows.map(mapAssignment);
}

export async function findAssignmentById(client, id) {
  const result = await client.query(`SELECT * FROM fee_assignments WHERE id = $1 LIMIT 1`, [id]);
  return mapAssignment(result.rows[0]);
}

export async function listBillableAssignments(client, tenantId, { studentUserIds, period }) {
  const result = await client.query(
    `SELECT fa.*, fc.name AS category_name, u.name AS student_name, sp.class_name, sp.section, sp.roll_number,
            (fa.amount + fa.fine_amount - fa.discount_amount - fa.waiver_amount - fa.scholarship_amount) AS net_amount
       FROM fee_assignments fa
       JOIN fee_categories fc ON fc.id = fa.category_id AND fc.is_active = true
       JOIN users u ON u.id = fa.student_user_id AND u.status = 'active'
       LEFT JOIN student_profiles sp ON sp.user_id = fa.student_user_id
      WHERE fa.tenant_id = $1
        AND fa.status = 'active'
        AND ($2::text[] IS NULL OR fa.student_user_id = ANY($2::text[]))
        AND (fa.start_period = '' OR fa.start_period <= $3)
        AND (fa.end_period = '' OR fa.end_period >= $3)
      ORDER BY fa.student_user_id, fc.name ASC`,
    [tenantId, studentUserIds?.length ? studentUserIds : null, period],
  );
  return result.rows.map(mapAssignment);
}

export async function insertAssignment(client, data) {
  const result = await client.query(
    `INSERT INTO fee_assignments
       (id, tenant_id, student_user_id, category_id, amount, discount_amount, waiver_amount,
        scholarship_amount, fine_amount, start_period, end_period, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [data.id, data.tenantId, data.studentUserId, data.categoryId, data.amount,
     data.discountAmount, data.waiverAmount, data.scholarshipAmount, data.fineAmount,
     data.startPeriod || '', data.endPeriod || '', data.status, data.notes || ''],
  );
  return mapAssignment(result.rows[0]);
}

export async function updateAssignment(client, data) {
  const result = await client.query(
    `UPDATE fee_assignments
        SET student_user_id=$2, category_id=$3, amount=$4, discount_amount=$5, waiver_amount=$6,
            scholarship_amount=$7, fine_amount=$8, start_period=$9, end_period=$10,
            status=$11, notes=$12, updated_at=NOW()
      WHERE id=$1 RETURNING *`,
    [data.id, data.studentUserId, data.categoryId, data.amount, data.discountAmount,
     data.waiverAmount, data.scholarshipAmount, data.fineAmount, data.startPeriod || '',
     data.endPeriod || '', data.status, data.notes || ''],
  );
  return mapAssignment(result.rows[0]);
}

export async function deleteAssignment(client, id) {
  await client.query(`DELETE FROM fee_assignments WHERE id = $1`, [id]);
}

export async function listInvoices(client, tenantId, filters = {}) {
  const result = await client.query(
    `SELECT ${invoiceSelect}
       FROM fee_invoices fi
       JOIN users u ON u.id = fi.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = fi.student_user_id
      WHERE fi.tenant_id = $1
        AND ($2::text IS NULL OR fi.status = $2)
        AND ($3::text IS NULL OR fi.period = $3)
        AND ($4::text IS NULL OR fi.student_user_id = $4)
      ORDER BY fi.created_at DESC`,
    [tenantId, filters.status || null, filters.period || null, filters.studentUserId || null],
  );
  return result.rows.map(mapInvoice);
}

export async function findInvoiceById(client, id) {
  const result = await client.query(
    `SELECT ${invoiceSelect}
       FROM fee_invoices fi
       JOIN users u ON u.id = fi.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = fi.student_user_id
      WHERE fi.id = $1 LIMIT 1`,
    [id],
  );
  return mapInvoice(result.rows[0]);
}

export async function findInvoiceForStudentPeriod(client, studentUserId, period) {
  const result = await client.query(`SELECT * FROM fee_invoices WHERE student_user_id=$1 AND period=$2 LIMIT 1`, [studentUserId, period]);
  return mapInvoice(result.rows[0]);
}

export async function insertInvoice(client, data) {
  const result = await client.query(
    `INSERT INTO fee_invoices
       (id, tenant_id, student_user_id, period, title, due_date, subtotal_amount, discount_amount,
        waiver_amount, scholarship_amount, fine_amount, total_amount, paid_amount, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,'unpaid',$13)
     RETURNING *`,
    [data.id, data.tenantId, data.studentUserId, data.period, data.title, data.dueDate || null,
     data.subtotalAmount, data.discountAmount, data.waiverAmount, data.scholarshipAmount,
     data.fineAmount, data.totalAmount, data.notes || ''],
  );
  return mapInvoice(result.rows[0]);
}

export async function insertInvoiceItem(client, data) {
  const result = await client.query(
    `INSERT INTO fee_invoice_items
       (id, invoice_id, category_id, assignment_id, description, amount, discount_amount,
        waiver_amount, scholarship_amount, fine_amount, total_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [data.id, data.invoiceId, data.categoryId, data.assignmentId, data.description, data.amount,
     data.discountAmount, data.waiverAmount, data.scholarshipAmount, data.fineAmount, data.totalAmount],
  );
  return mapInvoiceItem(result.rows[0]);
}

export async function listInvoiceItems(client, invoiceId) {
  const result = await client.query(
    `SELECT * FROM fee_invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
    [invoiceId],
  );
  return result.rows.map(mapInvoiceItem);
}

export async function listPayments(client, tenantId, filters = {}) {
  const result = await client.query(
    `SELECT fp.*, u.name AS student_name
       FROM fee_payments fp
       JOIN users u ON u.id = fp.student_user_id
      WHERE fp.tenant_id = $1
        AND ($2::text IS NULL OR fp.invoice_id = $2)
        AND ($3::text IS NULL OR fp.student_user_id = $3)
      ORDER BY fp.payment_date DESC, fp.created_at DESC`,
    [tenantId, filters.invoiceId || null, filters.studentUserId || null],
  );
  return result.rows.map(mapPayment);
}

export async function receiptNumberExists(client, receiptNumber) {
  const result = await client.query(`SELECT 1 FROM fee_payments WHERE receipt_number=$1 LIMIT 1`, [receiptNumber]);
  return result.rows.length > 0;
}

export async function insertPayment(client, data) {
  const result = await client.query(
    `INSERT INTO fee_payments
       (id, tenant_id, invoice_id, student_user_id, receipt_number, amount, method, payment_date,
        reference_no, notes, collected_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [data.id, data.tenantId, data.invoiceId, data.studentUserId, data.receiptNumber, data.amount,
     data.method, data.paymentDate, data.referenceNo || '', data.notes || '', data.collectedBy || null],
  );
  return mapPayment(result.rows[0]);
}

export async function updateInvoicePaymentStatus(client, invoiceId) {
  const result = await client.query(
    `WITH totals AS (
       SELECT fi.id, fi.total_amount, COALESCE(SUM(fp.amount), 0) AS paid_amount
         FROM fee_invoices fi
         LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
        WHERE fi.id = $1
        GROUP BY fi.id
     )
     UPDATE fee_invoices fi
        SET paid_amount = totals.paid_amount,
            status = CASE
              WHEN totals.paid_amount <= 0 THEN 'unpaid'
              WHEN totals.paid_amount >= totals.total_amount THEN 'paid'
              ELSE 'partial'
            END,
            updated_at = NOW()
       FROM totals
      WHERE fi.id = totals.id
      RETURNING fi.*`,
    [invoiceId],
  );
  return mapInvoice(result.rows[0]);
}

export async function listExpenses(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM expenses WHERE tenant_id = $1 ORDER BY expense_date DESC, created_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapExpense);
}

export async function insertExpense(client, data) {
  const result = await client.query(
    `INSERT INTO expenses (id, tenant_id, category, amount, expense_date, payee, method, reference_no, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [data.id, data.tenantId, data.category, data.amount, data.expenseDate, data.payee || '',
     data.method, data.referenceNo || '', data.notes || '', data.createdBy || null],
  );
  return mapExpense(result.rows[0]);
}

export async function deleteExpense(client, id) {
  await client.query(`DELETE FROM expenses WHERE id = $1`, [id]);
}

export async function getFeeReport(client, tenantId, period = null) {
  const result = await client.query(
    `SELECT
       COALESCE(SUM(total_amount), 0) AS billed,
       COALESCE(SUM(paid_amount), 0) AS collected,
       COALESCE(SUM(total_amount - paid_amount), 0) AS due,
       COUNT(*)::int AS invoice_count,
       COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
       COUNT(*) FILTER (WHERE status = 'partial')::int AS partial_count,
       COUNT(*) FILTER (WHERE status = 'unpaid')::int AS unpaid_count
     FROM fee_invoices
     WHERE tenant_id = $1 AND ($2::text IS NULL OR period = $2)`,
    [tenantId, period || null],
  );
  const expenses = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses WHERE tenant_id = $1`,
    [tenantId],
  );
  return {
    billed: toMoney(result.rows[0].billed),
    collected: toMoney(result.rows[0].collected),
    due: toMoney(result.rows[0].due),
    expenses: toMoney(expenses.rows[0].expenses),
    invoiceCount: Number(result.rows[0].invoice_count || 0),
    paidCount: Number(result.rows[0].paid_count || 0),
    partialCount: Number(result.rows[0].partial_count || 0),
    unpaidCount: Number(result.rows[0].unpaid_count || 0),
  };
}
