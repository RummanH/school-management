import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { hashPassword, validatePasswordStrength } from "../lib/passwords.js";
import {
  listTeachers,
  listPublicTeachers,
  insertTeacherProfile,
  updateTeacherProfile,
} from "../repositories/teacherRepository.js";
import {
  findUserByEmailInTenant,
  findUserById,
  insertUser,
  updateUser,
  deleteUser,
} from "../repositories/userRepository.js";

export class TeacherService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  list(actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listTeachers(client, actor.tenantId));
  }

  listPublic(limit = 12) {
    return this.databaseManager.withClient((client) => listPublicTeachers(client, limit));
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
        role: "teacher",
        status: input.status || "active",
      });

      await insertTeacherProfile(client, {
        id: createId("tp"),
        tenantId: actor.tenantId,
        userId,
        employeeId: input.employeeId,
        designation: input.designation,
        photoUrl: input.photoUrl,
        department: input.department,
        subjects: input.subjects,
        qualification: input.qualification,
        baseSalary: input.baseSalary,
        joiningDate: input.joiningDate,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        phone: input.phone,
        address: input.address,
      });

      return listTeachers(client, actor.tenantId);
    });
  }

  async update(userId, input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, userId);
      assert(existing, "Teacher not found.", 404);
      assert(existing.tenant_id === actor.tenantId, "Teacher not found.", 404);
      assert(existing.role === "teacher", "User is not a teacher.", 400);

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

      await updateUser(client, { id: userId, name, email, role: "teacher", status, passwordHash });
      await updateTeacherProfile(client, {
        userId,
        employeeId: input.employeeId,
        designation: input.designation,
        photoUrl: input.photoUrl,
        department: input.department,
        subjects: input.subjects,
        qualification: input.qualification,
        baseSalary: input.baseSalary,
        joiningDate: input.joiningDate,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        phone: input.phone,
        address: input.address,
      });

      return listTeachers(client, actor.tenantId);
    });
  }

  async remove(userId, actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findUserById(client, userId);
      assert(existing, "Teacher not found.", 404);
      assert(existing.tenant_id === actor.tenantId, "Teacher not found.", 404);
      assert(existing.role === "teacher", "User is not a teacher.", 400);
      await deleteUser(client, userId);
      return listTeachers(client, actor.tenantId);
    });
  }
}
