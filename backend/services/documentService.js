import { assert } from "../lib/errors.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { listResultsByStudent, getAttendanceSummary } from "../repositories/academicRepository.js";
import { listInvoices, listPayments } from "../repositories/feeRepository.js";

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
}
