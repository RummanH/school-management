import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import {
  listApplications,
  findApplicationById,
  findApplicationByReference,
  referenceCodeExists,
  insertApplication,
  updateApplicationStatus,
} from "../repositories/admissionRepository.js";

export const APPLICATION_STATUSES = ["submitted", "under_review", "test_scheduled", "accepted", "rejected"];

// Avoids 0/O/1/I so a code is unambiguous when read aloud or typed by hand.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Base64 is ~4/3 the size of the underlying binary — this caps the decoded
// photo at roughly 1.5MB. The public form is expected to resize/compress the
// image client-side before submit; this is a server-side safety net, not the
// primary size control.
const MAX_PHOTO_BASE64_LENGTH = 2_000_000;

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `ADM-${code}`;
}

export class AdmissionService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async apply(input) {
    const applicantName = (input.applicantName || "").trim();
    const guardianName = (input.guardianName || "").trim();
    const guardianPhone = (input.guardianPhone || "").trim();
    const guardianEmail = (input.guardianEmail || "").trim();
    const applyingForClass = (input.applyingForClass || "").trim();
    const previousSchool = (input.previousSchool || "").trim();
    const dateOfBirth = (input.dateOfBirth || "").trim();
    const gender = (input.gender || "").trim();
    const photoData = input.photoData || null;

    assert(applicantName, "Applicant name is required.", 400);
    assert(guardianName, "Guardian name is required.", 400);
    assert(guardianPhone, "Guardian phone is required.", 400);
    assert(applyingForClass, "Class applying for is required.", 400);
    assert(!photoData || photoData.length <= MAX_PHOTO_BASE64_LENGTH, "Photo is too large — please use a smaller image.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      let referenceCode = null;
      for (let attempt = 0; attempt < 5 && !referenceCode; attempt++) {
        const candidate = generateCode();
        if (!(await referenceCodeExists(client, candidate))) referenceCode = candidate;
      }
      assert(referenceCode, "Could not generate a reference code — please try again.", 500);

      return insertApplication(client, {
        id: createId("adm"),
        referenceCode,
        applicantName, dateOfBirth, gender, applyingForClass,
        guardianName, guardianPhone, guardianEmail, previousSchool, photoData,
      });
    });
  }

  async checkStatus(referenceCode) {
    const cleanCode = (referenceCode || "").trim().toUpperCase();
    assert(cleanCode, "Reference code is required.", 400);

    return this.databaseManager.withClient(async (client) => {
      const application = await findApplicationByReference(client, cleanCode);
      assert(application, "No application found with that reference code.", 404);
      return application;
    });
  }

  async listAll(status) {
    return this.databaseManager.withClient((client) => listApplications(client, status));
  }

  async getById(id) {
    return this.databaseManager.withClient(async (client) => {
      const application = await findApplicationById(client, id);
      assert(application, "Application not found.", 404);
      return application;
    });
  }

  async updateStatus(id, input) {
    const status = APPLICATION_STATUSES.includes(input.status) ? input.status : null;

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findApplicationById(client, id);
      assert(existing, "Application not found.", 404);

      return updateApplicationStatus(client, {
        id,
        status: status || existing.status,
        notes: input.notes ?? existing.notes,
        admissionTestDate: input.admissionTestDate ?? existing.admissionTestDate,
      });
    });
  }
}
