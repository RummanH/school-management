import crypto from "node:crypto";
import { assert } from "../lib/errors.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { listResultsByStudent, getAttendanceSummary } from "../repositories/academicRepository.js";
import { listInvoices, listPayments } from "../repositories/feeRepository.js";
import { isWardOfGuardian } from "../repositories/guardianRepository.js";
import { insertIssuance, findIssuanceByCode } from "../repositories/documentRepository.js";
import { dateText } from "../lib/pdf/kit.js";
import {
  buildReportCardPdf, buildCertificatePdf, buildTransferCertificatePdf,
  buildAdmitCardPdf, buildIdCardPdf, buildFeeReceiptPdf,
} from "../lib/pdf/documents.js";

const GENERATORS = {
  'report-card': buildReportCardPdf,
  certificate: buildCertificatePdf,
  'transfer-certificate': buildTransferCertificatePdf,
  'admit-card': buildAdmitCardPdf,
  'id-card': buildIdCardPdf,
  'fee-receipt': buildFeeReceiptPdf,
};

function schoolInfo(tenant) {
  return {
    name: tenant?.name || 'School Management System',
    logoUrl: tenant?.logoUrl || '',
    address: tenant?.address || 'School address',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
  };
}

function shortVerifyCode() {
  return crypto.randomBytes(6).toString('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
}

function filenameFor(type, subject) {
  const slug = (subject.name || 'student').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${type}-${slug || 'student'}.pdf`;
}

export class DocumentService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getStudentDocumentData(studentUserId, actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient(async (client) => {
      const student = await findStudentByUserId(client, studentUserId);
      assert(student && student.tenantId === actor.tenantId, "Student not found.", 404);

      const [results, attendance, invoices, payments] = await Promise.all([
        listResultsByStudent(client, studentUserId),
        student.classId ? getAttendanceSummary(client, studentUserId, student.classId) : Promise.resolve(null),
        listInvoices(client, actor.tenantId, { studentUserId }),
        listPayments(client, actor.tenantId, { studentUserId }),
      ]);

      return { student, results, attendance, invoices, payments };
    });
  }

  async _issueAndBuild(type, studentUserId, actor, tenant, options, verifyOrigin) {
    assert(GENERATORS[type], "Unknown document type.", 400);
    const data = await this.getStudentDocumentData(studentUserId, actor);
    const school = schoolInfo(tenant);
    const subject = { ...data.student };
    const ledger = { invoices: data.invoices, payments: data.payments };

    const issuance = await this.databaseManager.withTransaction(async (client) => {
      let code = null;
      for (let i = 0; i < 10; i++) {
        const candidate = shortVerifyCode();
        if (!(await findIssuanceByCode(client, candidate))) { code = candidate; break; }
      }
      assert(code, "Could not generate a verification code.", 500);
      return insertIssuance(client, {
        tenantId: actor.tenantId,
        studentUserId,
        documentType: type,
        verifyCode: code,
        issuedBy: actor.id,
        metadata: { kind: options.kind || null, paymentId: options.paymentId || null },
      });
    });

    const verify = {
      code: issuance.verifyCode,
      issuedAt: dateText(issuance.createdAt),
      url: `${verifyOrigin}/verify/${issuance.verifyCode}`,
    };

    const buffer = await GENERATORS[type]({
      school, subject, results: data.results, attendance: data.attendance,
      ledger, paymentId: options.paymentId, kind: options.kind, verify,
    });
    return { buffer, filename: filenameFor(type, subject) };
  }

  // Admin/teacher/accountant generating a document for any student in their school.
  async generateForStudent(type, studentUserId, actor, tenant, options, verifyOrigin) {
    return this._issueAndBuild(type, studentUserId, actor, tenant, options, verifyOrigin);
  }

  // A student downloading their own document.
  async generateForSelf(type, actor, tenant, options, verifyOrigin) {
    assert(actor.role === 'student', "Only students can download their own documents.", 403);
    return this._issueAndBuild(type, actor.id, actor, tenant, options, verifyOrigin);
  }

  // A guardian downloading a linked ward's document.
  async generateForWard(type, studentUserId, actor, tenant, options, verifyOrigin) {
    assert(actor.role === 'guardian', "Only guardians can download ward documents.", 403);
    const allowed = await this.databaseManager.withClient((client) => isWardOfGuardian(client, actor.id, studentUserId));
    assert(allowed, "Ward not found.", 404);
    return this._issueAndBuild(type, studentUserId, actor, tenant, options, verifyOrigin);
  }

  // Public — anyone holding the code (e.g. scanning the QR on a printed
  // certificate) can confirm it's genuine, without any login. Only returns
  // safe, low-sensitivity fields: no marks, fees, or contact details.
  async verifyDocument(code) {
    return this.databaseManager.withClient(async (client) => {
      const issuance = await findIssuanceByCode(client, String(code || '').toUpperCase());
      if (!issuance) return { valid: false };
      return {
        valid: true,
        documentType: issuance.documentType,
        studentName: issuance.studentName,
        className: issuance.className,
        section: issuance.section,
        schoolName: issuance.tenantName,
        issuedAt: issuance.createdAt,
      };
    });
  }
}
