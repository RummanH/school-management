import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { findStudentByUserId, listStudents } from "../repositories/studentRepository.js";
import { isWardOfGuardian } from "../repositories/guardianRepository.js";
import { findClassById } from "../repositories/academicRepository.js";
import { listTenants } from "../repositories/tenantRepository.js";
import {
  toMoney,
  listCategories, findCategoryById, insertCategory, updateCategory, deleteCategory,
  listFeeStructures, findFeeStructureById, insertFeeStructure, updateFeeStructure, deleteFeeStructure, listActiveFeeStructures,
  listAssignments, findAssignmentById, listBillableAssignments, listPreviouslyBilledOneTimeCategories, insertAssignment, updateAssignment, deleteAssignment,
  listInvoices, findInvoiceById, findInvoiceByIdForUpdate, findInvoiceForStudentPeriod, insertInvoice, insertInvoiceItem, listInvoiceItems,
  listPayments, receiptNumberExists, insertPayment, updateInvoicePaymentStatus,
  listExpenses, insertExpense, deleteExpense,
  listDonations, insertDonation, deleteDonation, getFeeReport,
  getDefaulters, getStudentMonthlyLedger, listOverdueInvoicesForFines, applyInvoiceFine,
} from "../repositories/feeRepository.js";
import { insertTransaction } from "../repositories/financeRepository.js";

const BILLING_CYCLES = ["monthly", "term", "annual", "one_time"];
const BILLING_MODES = ["monthly", "selected"];
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

export function shouldIncludeFeeForRun(fee, { billingMode, categoryIds = [], previouslyBilledOneTimeIds = [] }) {
  if (billingMode === "monthly") return fee.billingCycle === "monthly";
  const selected = categoryIds instanceof Set ? categoryIds : new Set(categoryIds);
  if (!selected.has(fee.categoryId)) return false;
  const previouslyBilled = previouslyBilledOneTimeIds instanceof Set
    ? previouslyBilledOneTimeIds
    : new Set(previouslyBilledOneTimeIds);
  return fee.billingCycle !== "one_time" || !previouslyBilled.has(fee.categoryId);
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
      billingCycle, lateFeeAmount: money(input.lateFeeAmount || 0, "Late fee amount"), isActive: input.isActive !== false,
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
        lateFeeAmount: money(input.lateFeeAmount ?? existing.lateFeeAmount, "Late fee amount"),
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

  async listFeeStructures(actor) {
    return this.databaseManager.withClient((client) => listFeeStructures(client, actor.tenantId));
  }

  async saveFeeStructure(id, input, actor) {
    const categoryId = cleanText(input.categoryId);
    const classId = cleanText(input.classId) || null;
    assert(categoryId, "Fee category is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      if (id) {
        const existing = await findFeeStructureById(client, id);
        assert(existing && existing.tenantId === actor.tenantId, "Fee rule not found.", 404);
      }
      const category = await findCategoryById(client, categoryId);
      assert(category && category.tenantId === actor.tenantId, "Fee category not found.", 404);
      if (classId) {
        const cls = await findClassById(client, classId);
        assert(cls && cls.tenant_id === actor.tenantId, "Class not found.", 404);
      }

      const data = {
        id: id || createId("fee_str"), tenantId: actor.tenantId, classId, categoryId,
        amount: money(input.amount ?? category.defaultAmount, "Amount"),
        isActive: input.isActive !== false,
      };
      return id ? updateFeeStructure(client, data) : insertFeeStructure(client, data);
    });
  }

  async deleteFeeStructure(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findFeeStructureById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Fee rule not found.", 404);
      await deleteFeeStructure(client, id);
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

  // Resolves, per active student, the list of billable line items for a period:
  // every active class-wide fee_structure that matches the student's class
  // (or applies to all classes), with any per-student fee_assignment for that
  // same category taking precedence, plus any assignment-only categories that
  // have no class rule at all (ad-hoc charges/scholarships).
  async resolveBillableItems(client, tenantId, { studentUserIds, period, billingMode, categoryIds }) {
    const [allStudents, structures, assignments] = await Promise.all([
      listStudents(client, tenantId),
      listActiveFeeStructures(client, tenantId),
      listBillableAssignments(client, tenantId, { studentUserIds, period }),
    ]);

    const students = allStudents.filter((s) =>
      s.status === "active" && (!studentUserIds || studentUserIds.includes(s.userId)));
    const selectedCategoryIds = new Set(categoryIds || []);
    const runOptions = { billingMode, categoryIds: selectedCategoryIds };
    const structuresForRun = structures.filter((row) => shouldIncludeFeeForRun(row, runOptions));
    const assignmentsForRun = assignments.filter((row) => shouldIncludeFeeForRun(row, runOptions));
    const previousPairs = billingMode === "selected"
      ? await listPreviouslyBilledOneTimeCategories(
          client, tenantId, students.map((student) => student.userId), [...selectedCategoryIds],
        )
      : [];
    const previousByStudent = new Map();
    for (const pair of previousPairs) {
      if (!previousByStudent.has(pair.studentUserId)) previousByStudent.set(pair.studentUserId, new Set());
      previousByStudent.get(pair.studentUserId).add(pair.categoryId);
    }

    const structuresByClass = new Map();
    for (const structure of structuresForRun) {
      const key = structure.classId || "";
      if (!structuresByClass.has(key)) structuresByClass.set(key, []);
      structuresByClass.get(key).push(structure);
    }

    const assignmentsByStudent = new Map();
    for (const assignment of assignmentsForRun) {
      if (!assignmentsByStudent.has(assignment.studentUserId)) assignmentsByStudent.set(assignment.studentUserId, new Map());
      assignmentsByStudent.get(assignment.studentUserId).set(assignment.categoryId, assignment);
    }

    const byStudent = new Map();
    for (const student of students) {
      const overrides = assignmentsByStudent.get(student.userId) || new Map();
      const previouslyBilledOneTimeIds = previousByStudent.get(student.userId) || new Set();
      const studentRunOptions = { ...runOptions, previouslyBilledOneTimeIds };
      const applicable = [
        ...(structuresByClass.get(student.classId || "") || []),
        ...(structuresByClass.get("") || []),
      ];
      const seenCategories = new Set();
      const items = [];
      for (const structure of applicable) {
        if (seenCategories.has(structure.categoryId)) continue;
        seenCategories.add(structure.categoryId);
        const override = overrides.get(structure.categoryId);
        const resolved = override || {
          id: null, studentUserId: student.userId, categoryId: structure.categoryId, categoryName: structure.categoryName,
          billingCycle: structure.billingCycle,
          amount: structure.amount, discountAmount: 0, waiverAmount: 0, scholarshipAmount: 0, fineAmount: 0,
          netAmount: structure.amount,
        };
        if (shouldIncludeFeeForRun(resolved, studentRunOptions)) items.push(resolved);
      }
      for (const [categoryId, assignment] of overrides.entries()) {
        if (!seenCategories.has(categoryId) && shouldIncludeFeeForRun(assignment, studentRunOptions)) {
          items.push(assignment);
          seenCategories.add(categoryId);
        }
      }
      if (items.length) byStudent.set(student.userId, items);
    }
    return byStudent;
  }

  async generateInvoices(input, actor) {
    const period = cleanText(input.period);
    assert(period, "Billing period is required, e.g. 2026-07 or Term 1.", 400);
    const billingMode = BILLING_MODES.includes(input.billingMode) ? input.billingMode : "monthly";
    const categoryIds = [...new Set(Array.isArray(input.categoryIds) ? input.categoryIds.filter(Boolean) : [])];
    if (billingMode === "monthly") {
      assert(/^\d{4}-\d{2}$/.test(period), "Monthly billing period must use YYYY-MM format.", 400);
    } else {
      assert(categoryIds.length > 0, "Select at least one additional fee category.", 400);
      assert(!/^\d{4}-\d{2}$/.test(period), "Use a unique reference such as 2026-HALF-YEARLY-EXAM for an additional charge.", 400);
    }
    const title = cleanText(input.title) || (billingMode === "monthly" ? `Monthly Fees - ${period}` : `Additional Charges - ${period}`);
    const dueDate = cleanText(input.dueDate);
    const eligibilityPeriod = billingMode === "monthly"
      ? period
      : (/^\d{4}-\d{2}/.test(dueDate) ? dueDate.slice(0, 7) : new Date().toISOString().slice(0, 7));
    const studentUserIds = Array.isArray(input.studentUserIds) && input.studentUserIds.length
      ? input.studentUserIds.filter(Boolean) : null;

    return this.databaseManager.withTransaction(async (client) => {
      if (billingMode === "selected") {
        const categories = await listCategories(client, actor.tenantId);
        const selected = categories.filter((category) => categoryIds.includes(category.id) && category.isActive);
        assert(selected.length === categoryIds.length, "One or more selected fee categories are unavailable.", 400);
        assert(selected.every((category) => category.billingCycle !== "monthly"), "Use the monthly billing run for recurring monthly categories.", 400);
      }
      const byStudent = await this.resolveBillableItems(client, actor.tenantId, {
        studentUserIds, period: eligibilityPeriod, billingMode, categoryIds,
      });

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
      return { created, skipped, studentCount: byStudent.size, billingMode };
    });
  }

  // Called by the monthly cron/scheduler (see backend/services/feeCronService.js)
  // to auto-bill every active student in a tenant for the given period.
  async generateMonthlyInvoicesForTenant(tenantId, period) {
    return this.generateInvoices({ period, billingMode: "monthly", studentUserIds: null }, { tenantId });
  }

  async generateMonthlyInvoicesForAllTenants(period) {
    const tenants = await this.databaseManager.withClient((client) => listTenants(client));
    const results = [];
    for (const tenant of tenants) {
      const result = await this.generateMonthlyInvoicesForTenant(tenant.id, period);
      results.push({ tenantId: tenant.id, tenantName: tenant.name, ...result });
    }
    return results;
  }

  // Adds each overdue category's configured late fee to its invoice once, so
  // repeated runs never double-charge (fee_invoices.fine_applied guards it).
  async applyOverdueFines(tenantId, today = new Date().toISOString().slice(0, 10)) {
    return this.databaseManager.withTransaction(async (client) => {
      const overdue = await listOverdueInvoicesForFines(client, tenantId, today);
      let applied = 0;
      for (const invoice of overdue) {
        if (invoice.lateFeeAmount <= 0) continue;
        await applyInvoiceFine(client, invoice.id, invoice.lateFeeAmount);
        applied += 1;
      }
      return { checked: overdue.length, applied };
    });
  }

  async applyOverdueFinesForAllTenants(today) {
    const tenants = await this.databaseManager.withClient((client) => listTenants(client));
    const results = [];
    for (const tenant of tenants) {
      results.push({ tenantId: tenant.id, ...(await this.applyOverdueFines(tenant.id, today)) });
    }
    return results;
  }

  async recordPayment(invoiceId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const invoice = await findInvoiceByIdForUpdate(client, invoiceId);
      assert(invoice && invoice.tenantId === actor.tenantId, "Invoice not found.", 404);
      const amount = money(input.amount, "Payment amount");
      assert(amount > 0, "Payment amount must be greater than zero.", 400);
      assert(amount <= invoice.dueAmount, "Payment cannot exceed invoice due amount.", 400);
      const method = PAYMENT_METHODS.includes(input.method) ? input.method : "cash";
      const paymentDate = cleanText(input.paymentDate) || new Date().toISOString().slice(0, 10);
      const payment = await insertPayment(client, {
        id: createId("fee_pay"), tenantId: actor.tenantId, invoiceId,
        studentUserId: invoice.studentUserId, receiptNumber: await generateReceiptNumber(client),
        amount, method, paymentDate,
        referenceNo: cleanText(input.referenceNo), notes: cleanText(input.notes), collectedBy: actor.id,
      });
      await updateInvoicePaymentStatus(client, invoiceId);
      await insertTransaction(client, {
        id: createId("fintx"), tenantId: actor.tenantId, direction: "in", sourceType: "fee_payment", sourceId: payment.id,
        amount, method, category: "Fee Payment", transactionDate: paymentDate, recordedBy: actor.id, notes: payment.notes,
      });
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
    const amount = money(input.amount, "Expense amount");
    const expenseDate = cleanText(input.expenseDate) || new Date().toISOString().slice(0, 10);
    const method = PAYMENT_METHODS.includes(input.method) ? input.method : "cash";
    return this.databaseManager.withTransaction(async (client) => {
      const expense = await insertExpense(client, {
        id: createId("exp"), tenantId: actor.tenantId, category, amount, expenseDate, payee: cleanText(input.payee),
        method, referenceNo: cleanText(input.referenceNo), notes: cleanText(input.notes), createdBy: actor.id,
      });
      await insertTransaction(client, {
        id: createId("fintx"), tenantId: actor.tenantId, direction: "out", sourceType: "expense", sourceId: expense.id,
        amount, method, category, transactionDate: expenseDate, recordedBy: actor.id, notes: expense.notes,
      });
      return expense;
    });
  }

  async deleteExpense(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const expenses = await listExpenses(client, actor.tenantId);
      assert(expenses.some((e) => e.id === id), "Expense not found.", 404);
      await deleteExpense(client, id);
    });
  }

  async listDonations(actor) {
    return this.databaseManager.withClient((client) => listDonations(client, actor.tenantId));
  }

  async createDonation(input, actor) {
    const amount = money(input.amount, "Donation amount");
    const donationDate = cleanText(input.donationDate) || new Date().toISOString().slice(0, 10);
    const method = PAYMENT_METHODS.includes(input.method) ? input.method : "cash";
    const donorName = cleanText(input.donorName);
    return this.databaseManager.withTransaction(async (client) => {
      const donation = await insertDonation(client, {
        id: createId("donation"), tenantId: actor.tenantId, donorName, amount, donationDate,
        method, notes: cleanText(input.notes), receivedBy: actor.id,
      });
      await insertTransaction(client, {
        id: createId("fintx"), tenantId: actor.tenantId, direction: "in", sourceType: "donation", sourceId: donation.id,
        amount, method, category: donorName ? `Donation — ${donorName}` : "Donation",
        transactionDate: donationDate, recordedBy: actor.id, notes: donation.notes,
      });
      return donation;
    });
  }

  async deleteDonation(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const donations = await listDonations(client, actor.tenantId);
      assert(donations.some((d) => d.id === id), "Donation not found.", 404);
      await deleteDonation(client, id);
    });
  }

  async getReport(actor, period = null) {
    return this.databaseManager.withClient((client) => getFeeReport(client, actor.tenantId, period));
  }

  async getDefaulters(actor, filters = {}) {
    return this.databaseManager.withClient((client) => getDefaulters(client, actor.tenantId, filters));
  }

  async getStudentMonthlyLedger(studentUserId, year, actor) {
    return this.databaseManager.withClient(async (client) => {
      const student = await findStudentByUserId(client, studentUserId);
      assert(student && student.tenantId === actor.tenantId, "Student not found.", 404);
      const months = await getStudentMonthlyLedger(client, actor.tenantId, studentUserId, year);
      return { student, year: Number(year), months };
    });
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
