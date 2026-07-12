import fs from "node:fs/promises";
import path from "node:path";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { verifyPassword, hashPassword, validatePasswordStrength } from "../lib/passwords.js";
import { publicUploadsPath } from "../config/paths.js";
import { findStudentByUserId, updateStudentProfile } from "../repositories/studentRepository.js";
import { findTeacherByUserId, updateTeacherProfile } from "../repositories/teacherRepository.js";
import { findUserByEmailInTenant, findUserById, updateOwnUserProfile, updatePasswordHash } from "../repositories/userRepository.js";

const PROFILE_IMAGE_DATA_URL_PATTERN = /^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/;
const PROFILE_IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

async function saveProfilePhoto(dataUrl) {
  const match = PROFILE_IMAGE_DATA_URL_PATTERN.exec(String(dataUrl || '').trim());
  assert(match, "Profile photo is invalid.", 400);
  const mimeType = match[1].toLowerCase();
  const extension = PROFILE_IMAGE_EXTENSIONS[mimeType];
  assert(extension, "Unsupported profile photo type. Allowed: JPG, PNG, WEBP, GIF.", 400);
  const buffer = Buffer.from(match[2], "base64");
  assert(buffer.length > 0, "Profile photo is empty.", 400);
  assert(buffer.length <= MAX_PROFILE_IMAGE_BYTES, "Profile photo must be 5MB or smaller.", 400);

  const dir = path.join(publicUploadsPath, "profiles");
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${createId("profile")}.${extension}`;
  await fs.writeFile(path.join(dir, fileName), buffer);
  return `/uploads/profiles/${fileName}`;
}

async function removeProfilePhoto(url) {
  if (!url?.startsWith("/uploads/profiles/")) return;
  const relativePath = url.replace(/^\/uploads\//, "");
  const absolutePath = path.join(publicUploadsPath, relativePath.replace(/\//g, path.sep));
  try {
    await fs.unlink(absolutePath);
  } catch {}
}

export class ProfileService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getProfile(actor) {
    return this.databaseManager.withClient(async (client) => {
      const user = await findUserById(client, actor.id);
      assert(user, "User not found.", 404);

      if (actor.role === "student") {
        const profile = await findStudentByUserId(client, actor.id);
        assert(profile, "Profile not set up yet.", 404);
        return { type: "student", profile };
      }

      if (actor.role === "teacher") {
        const profile = await findTeacherByUserId(client, actor.id);
        assert(profile, "Profile not set up yet.", 404);
        return { type: "teacher", profile };
      }

      return {
        type: "user",
        profile: {
          id: user.id,
          tenantId: user.tenant_id || null,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone || null,
          address: user.address || null,
          photoUrl: user.photo_url || null,
        },
      };
    });
  }

  async updateProfile(actor, input) {
    const nextName = String(input.name || "").trim();
    const nextEmail = String(input.email || "").trim().toLowerCase();
    assert(nextName, "Name is required.", 400);
    assert(nextEmail, "Email is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const user = await findUserById(client, actor.id);
      assert(user, "User not found.", 404);

      if (nextEmail !== String(user.email || "").toLowerCase()) {
        const duplicate = await findUserByEmailInTenant(client, nextEmail, user.tenant_id || null);
        assert(!duplicate || duplicate.id === actor.id, "A user with this email already exists.", 409);
      }

      let nextPhotoUrl = user.photo_url || null;
      if (input.removePhoto) {
        await removeProfilePhoto(nextPhotoUrl);
        nextPhotoUrl = null;
      }
      if (input.photoData) {
        const uploadedUrl = await saveProfilePhoto(input.photoData);
        await removeProfilePhoto(nextPhotoUrl);
        nextPhotoUrl = uploadedUrl;
      }

      const basePhone = cleanOptional(input.phone);
      const baseAddress = cleanOptional(input.address);

      await updateOwnUserProfile(client, {
        id: actor.id,
        name: nextName,
        email: nextEmail,
        phone: basePhone,
        address: baseAddress,
        photoUrl: nextPhotoUrl,
      });

      if (actor.role === "student") {
        const existing = await findStudentByUserId(client, actor.id);
        assert(existing, "Profile not set up yet.", 404);
        await updateStudentProfile(client, {
          userId: actor.id,
          classId: existing.classId,
          studentId: existing.studentId,
          className: existing.className,
          section: existing.section,
          rollNumber: existing.rollNumber,
          admissionDate: existing.admissionDate,
          dateOfBirth: cleanOptional(input.dateOfBirth) ?? existing.dateOfBirth,
          gender: cleanOptional(input.gender) ?? existing.gender,
          bloodGroup: cleanOptional(input.bloodGroup) ?? existing.bloodGroup,
          phone: basePhone,
          address: baseAddress,
          guardianName: cleanOptional(input.guardianName) ?? existing.guardianName,
          guardianPhone: cleanOptional(input.guardianPhone) ?? existing.guardianPhone,
          guardianRelation: cleanOptional(input.guardianRelation) ?? existing.guardianRelation,
          photoUrl: nextPhotoUrl,
        });
        return { type: "student", profile: await findStudentByUserId(client, actor.id) };
      }

      if (actor.role === "teacher") {
        const existing = await findTeacherByUserId(client, actor.id);
        assert(existing, "Profile not set up yet.", 404);
        await updateTeacherProfile(client, {
          userId: actor.id,
          employeeId: existing.employeeId,
          designation: cleanOptional(input.designation) ?? existing.designation,
          photoUrl: nextPhotoUrl,
          department: cleanOptional(input.department) ?? existing.department,
          subjects: cleanOptional(input.subjects) ?? existing.subjects,
          qualification: cleanOptional(input.qualification) ?? existing.qualification,
          baseSalary: existing.baseSalary,
          joiningDate: existing.joiningDate,
          dateOfBirth: cleanOptional(input.dateOfBirth) ?? existing.dateOfBirth,
          gender: cleanOptional(input.gender) ?? existing.gender,
          bloodGroup: cleanOptional(input.bloodGroup) ?? existing.bloodGroup,
          phone: basePhone,
          address: baseAddress,
        });
        return { type: "teacher", profile: await findTeacherByUserId(client, actor.id) };
      }

      const updatedUser = await findUserById(client, actor.id);
      return {
        type: "user",
        profile: {
          id: updatedUser.id,
          tenantId: updatedUser.tenant_id || null,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          phone: updatedUser.phone || null,
          address: updatedUser.address || null,
          photoUrl: updatedUser.photo_url || null,
        },
      };
    });
  }

  async changePassword(actor, input) {
    const currentPassword = String(input.currentPassword || "");
    const newPassword = String(input.newPassword || "");
    assert(currentPassword, "Current password is required.", 400);
    const strengthError = validatePasswordStrength(newPassword);
    assert(!strengthError, strengthError, 400);
    assert(newPassword !== currentPassword, "New password must be different from current password.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const user = await findUserById(client, actor.id);
      assert(user, "User not found.", 404);
      const valid = await verifyPassword(currentPassword, user.password_hash);
      assert(valid, "Current password is incorrect.", 400);
      await updatePasswordHash(client, actor.id, await hashPassword(newPassword));
      return { success: true };
    });
  }
}

function cleanOptional(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || "").trim();
  return trimmed || null;
}
