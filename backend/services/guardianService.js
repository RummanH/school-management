import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import {
  listWardsForGuardian,
  listWardLinkIds,
  isWardOfGuardian,
  linkGuardianStudent,
  unlinkGuardianStudent,
} from "../repositories/guardianRepository.js";
import { findUserById } from "../repositories/userRepository.js";
import { findStudentByUserId } from "../repositories/studentRepository.js";
import { listResultsByStudent, getAttendanceSummary } from "../repositories/academicRepository.js";

export class GuardianService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  // ── Guardian self-service ───────────────────────────────────────────────

  async listWards(actor) {
    return this.databaseManager.withClient((client) => listWardsForGuardian(client, actor.id));
  }

  async getWardResults(actor, studentUserId) {
    return this.databaseManager.withClient(async (client) => {
      const isWard = await isWardOfGuardian(client, actor.id, studentUserId);
      assert(isWard, "Student not found.", 404);
      return listResultsByStudent(client, studentUserId);
    });
  }

  async getWardAttendance(actor, studentUserId) {
    return this.databaseManager.withClient(async (client) => {
      const isWard = await isWardOfGuardian(client, actor.id, studentUserId);
      assert(isWard, "Student not found.", 404);
      const student = await findStudentByUserId(client, studentUserId);
      assert(student?.classId, "Ward is not assigned to a class yet.", 400);
      return getAttendanceSummary(client, studentUserId, student.classId);
    });
  }

  // ── Admin link management ───────────────────────────────────────────────

  async listWardLinks(guardianUserId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const guardian = await findUserById(client, guardianUserId);
      assert(guardian && guardian.tenant_id === actor.tenantId && guardian.role === "guardian", "Guardian not found.", 404);
      return listWardLinkIds(client, guardianUserId);
    });
  }

  async linkWard(guardianUserId, studentUserId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const guardian = await findUserById(client, guardianUserId);
      assert(guardian && guardian.tenant_id === actor.tenantId && guardian.role === "guardian", "Guardian not found.", 404);

      const student = await findUserById(client, studentUserId);
      assert(student && student.tenant_id === actor.tenantId && student.role === "student", "Student not found.", 404);

      await linkGuardianStudent(client, {
        id: createId("gs"),
        tenantId: actor.tenantId,
        guardianUserId,
        studentUserId,
      });
      return listWardLinkIds(client, guardianUserId);
    });
  }

  async unlinkWard(guardianUserId, studentUserId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const guardian = await findUserById(client, guardianUserId);
      assert(guardian && guardian.tenant_id === actor.tenantId && guardian.role === "guardian", "Guardian not found.", 404);

      await unlinkGuardianStudent(client, guardianUserId, studentUserId);
      return listWardLinkIds(client, guardianUserId);
    });
  }
}
