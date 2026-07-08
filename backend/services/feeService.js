import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { isWardOfGuardian } from "../repositories/guardianRepository.js";
import {
  toMoney,
  listCategories, findCategoryById, insertCategory, updateCategory, deleteCategory,
  listAssignments, findAssignmentById, listBillableAssignments, insertAssignment, updateAssignment, deleteAssignment,
  listInvoices, findInvoiceById, findInvoiceForStudentPeriod, insertInvoice, insertInvoiceItem, listInvoiceItems,
  listPayments, receiptNumberExists, insertPayment, updateInvoicePaymentStatus,
  listExpenses, insertExpense, deleteExpense, getFeeReport,
} from "../repositories/feeRepository.js";

const BILLING_CYCLES = ["monthly", "term", "annual", "one_time"];
const ASSIGNMENT_STATUSES = ["active", "inactive"];
const PAYMENT_METHODS = ["cash", "bank", "bkash", "nagad", "rocket", "card", "other"];

function cleanText(value) { return (value || "").trim(); }
function money(value, label) {
  const n = toMoney(value);
  assert(n >= 0, `${label} cannot be negative.`, 400);
  return n;
}
function netFor(input) {
  return Math.max(0, toMoney(input.amount) + toMoney(input.fineAmount) - toMoney(input.discountAmount) - toMoney(input.waiverAmount) - toMoney(input.scholarshipAmount));
}

async function generateReceiptNumber(client) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const candidate = `RCPT-${stamp}-${suffix}`;
    if (!(await receiptNumberExists(client, candidate))) return candidate;
  }
  throw new Error("Could not generate receipt number.");
}

export class FeeService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listCategories(actor) {
    return this.databaseManager.withClient((client) => listCategories(client, actor.tenantId));
  }

  async createCategory(input, actor) {
    const name = cleanText(input.name);
    assert(name, "Fee category name is required.", 400);
    const billingCycle = BILLING_CYCLES.includes(input.billingCycle) ? input.billingCycle : "monthly";
    return this.databaseManager.withTransaction((client) => insertCategory(client, {
      id: createId("fee_cat"), tenantId: actor.tenantId, name,
      description: cleanText(input.description), defaultAmount: money(input.defaultAmount, "Default amount"),
      billingCycle, isActive: input.isActive !== false,
    }));
  }

  async updateCategory(id, input, actor) {
    const name = cleanText(input.name);
    assert(name, "Fee category name is required.", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findCategoryById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Fee category not found.", 404);
      return updateCategory(client, {
        id, name, description: cleanText(input.description),
        defaultAmount: money(input.defaultAmount, "Default amount"),
        billingCycle: BILLING_CYCLES.includes(input.billingCycle) ? input.billingCycle : existing.billingCycle,
        isActive: input.isActive !== false,
      });
    });
  }

  async deleteCategory(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findCategoryById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Fee category not found.", 404);
      await deleteCategory(client, id);
    });
  }

  async listAssignments(actor, studentUserId = null) {
    return this.databaseManager.withClient((client) => listAssignments(client, actor.tenantId, studentUserId));
  }

  async createAssignment(input, actor) {
    return this.saveAssignment(null, input, actor);
  }

  async updateAssignment(id, input, actor) {
    return this.saveAssignment(id, input, actor);
  }

  async saveAssignment(id, input, actor) {
    const studentUserId = cleanText(input.studentUserId);
    const categoryId = cleanText(input.categoryId);
    assert(studentUserId, "Student is required.", 400);
    assert(categoryId, "Fee category is required.", 400);
    const status = ASSIGNMENT_STATUSES.includes(input.status) ? input.status : "active";

    return this.databaseManager.withTransaction(async (client) => {
      if (id) {
        const existing = await findAssignmentById(client, id);
        assert(existing && existing.tenantId === actor.tenantId, "Fee assignment not found.", 404);
      }
      const student = await findStudentByUserId(client, studentUserId);
      assert(student && student.tenantId === actor.tenantId, "Student not found.", 404);
      const category = await findCategoryById(client, categoryId);
      assert(category && category.tenantId === actor.tenantId, "Fee category not found.", 404);

      const data = {
        id: id || createId("fee_asg"), tenantId: actor.tenantId, studentUserId, categoryId,
        amount: money(input.amount ?? category.defaultAmount, "Amount"),
        discountAmount: money(input.discountAmount, "Discount"),
        waiverAmount: money(input.waiverAmount, "Waiver"),
        scholarshipAmount: money(input.scholarshipAmount, "Scholarship"),
        fineAmount: money(input.fineAmount, "Fine"),
        startPeriod: cleanText(input.startPeriod), endPeriod: cleanText(input.endPeriod),
        status, notes: cleanText(input.notes),
      };
      return id ? updateAssignment(client, data) : insertAssignment(client, data);
    });
  }

  async deleteAssignment(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findAssignmentById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Fee assignment not found.", 404);
      await deleteAssignment(client, id);
    });
  }

  async listInvoices(actor, filters = {}) {
    return this.databaseManager.withClient((client) => listInvoices(client, actor.tenantId, filters));
  }

  async getInvoice(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const invoice = await findInvoiceById(client, id);
      assert(invoice && invoice.tenantId === actor.tenantId, "Invoice not found.", 404);
      const [items, payments] = await Promise.all([
        listInvoiceItems(client, id),
        listPayments(client, actor.tenantId, { invoiceId: id }),
      ]);
      return { ...invoice, items, payments };
    });
  }

  async generateInvoices(input, actor) {
    const period = cleanText(input.period);
    assert(period, "Billing period is required, e.g. 2026-07 or Term 1.", 400);
    const title = cleanText(input.title) || `Fees - ${period}`;
    const dueDate = cleanText(input.dueDate);
    const studentUserIds = Array.isArray(input.studentUserIds) ? input.studentUserIds.filter(Boolean) : null;

    return this.databaseManager.withTransaction(async (client) => {
      const assignments = await listBillableAssignments(client, actor.tenantId, { studentUserIds, period });
      const byStudent = new Map();
      for (const assignment of assignments) {
        if (!byStudent.has(assignment.studentUserId)) byStudent.set(assignment.studentUserId, []);
        byStudent.get(assignment.studentUserId).push(assignment);
      }

      const created = [];
      const skipped = [];
      for (const [studentUserId, rows] of byStudent.entries()) {
        const existing = await findInvoiceForStudentPeriod(client, studentUserId, period);
        if (existing) { skipped.push(existing); continue; }
        const totals = rows.reduce((acc, row) => {
          acc.subtotalAmount += row.amount;
          acc.discountAmount += row.discountAmount;
          acc.waiverAmount += row.waiverAmount;
          acc.scholarshipAmount += row.scholarshipAmount;
          acc.fineAmount += row.fineAmount;
          acc.totalAmount += Math.max(0, row.netAmount);
          return acc;
        }, { subtotalAmount: 0, discountAmount: 0, waiverAmount: 0, scholarshipAmount: 0, fineAmount: 0, totalAmount: 0 });
        const invoice = await insertInvoice(client, {
          id: createId("fee_inv"), tenantId: actor.tenantId, studentUserId, period, title, dueDate,
          subtotalAmount: toMoney(totals.subtotalAmount), discountAmount: toMoney(totals.discountAmount),
          waiverAmount: toMoney(totals.waiverAmount), scholarshipAmount: toMoney(totals.scholarshipAmount),
          fineAmount: toMoney(totals.fineAmount), totalAmount: toMoney(totals.totalAmount),
          notes: cleanText(input.notes),
        });
        for (const row of rows) {
          await insertInvoiceItem(client, {
            id: createId("fee_item"), invoiceId: invoice.id, categoryId: row.categoryId, assignmentId: row.id,
            description: row.categoryName, amount: row.amount, discountAmount: row.discountAmount,
            waiverAmount: row.waiverAmount, scholarshipAmount: row.scholarshipAmount,
            fineAmount: row.fineAmount, totalAmount: row.netAmount,
          });
        }
        created.push(invoice);
      }
      return { created, skipped, assignmentCount: assignments.length };
    });
  }

  async recordPayment(invoiceId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const invoice = await findInvoiceById(client, invoiceId);
      assert(invoice && invoice.tenantId === actor.tenantId, "Invoice not found.", 404);
      const amount = money(input.amount, "Payment amount");
      assert(amount > 0, "Payment amount must be greater than zero.", 400);
      assert(amount <= invoice.dueAmount, "Payment cannot exceed invoice due amount.", 400);
      const method = PAYMENT_METHODS.includes(input.method) ? input.method : "cash";
      const payment = await insertPayment(client, {
        id: createId("fee_pay"), tenantId: actor.tenantId, invoiceId,
        studentUserId: invoice.studentUserId, receiptNumber: await generateReceiptNumber(client),
        amount, method, paymentDate: cleanText(input.paymentDate) || new Date().toISOString().slice(0, 10),
        referenceNo: cleanText(input.referenceNo), notes: cleanText(input.notes), collectedBy: actor.id,
      });
      await updateInvoicePaymentStatus(client, invoiceId);
      return payment;
    });
  }

  async listPayments(actor, filters = {}) {
    return this.databaseManager.withClient((client) => listPayments(client, actor.tenantId, filters));
  }

  async listExpenses(actor) {
    return this.databaseManager.withClient((client) => listExpenses(client, actor.tenantId));
  }

  async createExpense(input, actor) {
    const category = cleanText(input.category);
    assert(category, "Expense category is required.", 400);
    return this.databaseManager.withTransaction((client) => insertExpense(client, {
      id: createId("exp"), tenantId: actor.tenantId, category,
      amount: money(input.amount, "Expense amount"),
      expenseDate: cleanText(input.expenseDate) || new Date().toISOString().slice(0, 10),
      payee: cleanText(input.payee), method: PAYMENT_METHODS.includes(input.method) ? input.method : "cash",
      referenceNo: cleanText(input.referenceNo), notes: cleanText(input.notes), createdBy: actor.id,
    }));
  }

  async deleteExpense(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const expenses = await listExpenses(client, actor.tenantId);
      assert(expenses.some((e) => e.id === id), "Expense not found.", 404);
      await deleteExpense(client, id);
    });
  }

  async getReport(actor, period = null) {
    return this.databaseManager.withClient((client) => getFeeReport(client, actor.tenantId, period));
  }

  async getStudentLedger(studentUserId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const student = await findStudentByUserId(client, studentUserId);
      assert(student && student.tenantId === actor.tenantId, "Student not found.", 404);
      const [invoices, payments, assignments] = await Promise.all([
        listInvoices(client, actor.tenantId, { studentUserId }),
        listPayments(client, actor.tenantId, { studentUserId }),
        listAssignments(client, actor.tenantId, studentUserId),
      ]);
      const summary = invoices.reduce((acc, inv) => {
        acc.billed += inv.totalAmount; acc.paid += inv.paidAmount; acc.due += inv.dueAmount;
        return acc;
      }, { billed: 0, paid: 0, due: 0 });
      return { student, assignments, invoices, payments, summary: { billed: toMoney(summary.billed), paid: toMoney(summary.paid), due: toMoney(summary.due) } };
    });
  }

  async getMyFees(actor) {
    assert(actor.role === "student", "Only students can view this fee ledger.", 403);
    return this.getStudentLedger(actor.id, actor);
  }

  async getWardFees(studentUserId, actor) {
    assert(actor.role === "guardian", "Only guardians can view ward fee ledgers.", 403);
    return this.databaseManager.withClient(async (client) => {
      const allowed = await isWardOfGuardian(client, actor.id, studentUserId);
      assert(allowed, "Ward not found.", 404);
    }).then(() => this.getStudentLedger(studentUserId, { ...actor, role: "guardian" }));
  }
}
