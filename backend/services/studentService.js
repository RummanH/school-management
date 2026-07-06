import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { hashPassword, validatePasswordStrength } from "../lib/passwords.js";
import {
  listStudents,
  findStudentByUserId,
  insertStudentProfile,
  updateStudentProfile,
} from "../repositories/studentRepository.js";
import {
  findUserByEmailInTenant,
  findUserById,
  insertUser,
  updateUser,
  deleteUser,
} from "../repositories/userRepository.js";

export class StudentService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  list(actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listStudents(client, actor.tenantId));
  }

  async create(input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    const name = (input.name || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    assert(name, "Full name is required.", 400);
    assert(email, "Email is required.", 400);
    assert(password, "Password is required.", 400);

    const strengthError = validatePasswordStrength(password);
    assert(!strengthError, strengthError, 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserByEmailInTenant(client, email, actor.tenantId);
      assert(!existing, "A user with this email already exists.", 409);

      const userId = createId("user");
      await insertUser(client, {
        id: userId,
        tenantId: actor.tenantId,
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "student",
        status: input.status || "active",
      });

      await insertStudentProfile(client, {
        id: createId("sp"),
        tenantId: actor.tenantId,
        userId,
        classId: input.classId || null,
        studentId: input.studentId,
        className: input.className,
        section: input.section,
        rollNumber: input.rollNumber,
        admissionDate: input.admissionDate,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        phone: input.phone,
        address: input.address,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianRelation: input.guardianRelation,
      });

      return { students: await listStudents(client, actor.tenantId), userId };
    });
  }

  async update(userId, input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, userId);
      assert(existing, "Student not found.", 404);
      assert(existing.tenant_id === actor.tenantId, "Student not found.", 404);
      assert(existing.role === "student", "User is not a student.", 400);

      const name = (input.name || existing.name).trim();
      const email = (input.email || existing.email).trim().toLowerCase();
      const status = input.status ?? existing.status;

      if (email !== existing.email) {
        const dup = await findUserByEmailInTenant(client, email, actor.tenantId);
        assert(!dup || dup.id === userId, "A user with this email already exists.", 409);
      }

      let passwordHash = null;
      if (input.password) {
        const strengthError = validatePasswordStrength(input.password);
        assert(!strengthError, strengthError, 400);
        passwordHash = await hashPassword(String(input.password));
      }

      await updateUser(client, { id: userId, name, email, role: "student", status, passwordHash });
      await updateStudentProfile(client, {
        userId,
        classId: input.classId || null,
        studentId: input.studentId,
        className: input.className,
        section: input.section,
        rollNumber: input.rollNumber,
        admissionDate: input.admissionDate,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        phone: input.phone,
        address: input.address,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianRelation: input.guardianRelation,
      });

      return listStudents(client, actor.tenantId);
    });
  }

  async remove(userId, actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, userId);
      assert(existing, "Student not found.", 404);
      assert(existing.tenant_id === actor.tenantId, "Student not found.", 404);
      assert(existing.role === "student", "User is not a student.", 400);
      await deleteUser(client, userId);
      return listStudents(client, actor.tenantId);
    });
  }
}
