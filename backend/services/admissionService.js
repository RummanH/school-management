import fs from "node:fs/promises";
import path from "node:path";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { backendRoot } from "../config/paths.js";
import {
  listApplications,
  findApplicationById,
  findApplicationByReference,
  referenceCodeExists,
  insertApplication,
  updateApplicationStatus,
  listApplicationDocuments,
  findApplicationDocument,
  insertApplicationDocument,
  updateApplicationDocumentVerification,
} from "../repositories/admissionRepository.js";
import { findTenantBySlug } from "../repositories/tenantRepository.js";

export const APPLICATION_STATUSES = ["submitted", "under_review", "test_scheduled", "accepted", "rejected"];

// Avoids 0/O/1/I so a code is unambiguous when read aloud or typed by hand.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Base64 is ~4/3 the size of the underlying binary — this caps the decoded
// photo at roughly 1.5MB. The public form is expected to resize/compress the
// image client-side before submit; this is a server-side safety net, not the
// primary size control.
const MAX_PHOTO_BASE64_LENGTH = 2_000_000;
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const DOCUMENT_STORAGE_DIR = path.join(backendRoot, "storage", "admission-documents");
const DOCUMENT_TYPES = new Set(["birth_certificate", "previous_school_certificate", "transfer_certificate", "guardian_identity"]);
const DOCUMENT_STATUSES = new Set(["pending", "verified", "rejected", "needs_resubmission"]);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);


function decodeDocument(document) {
  const data = String(document.data || '');
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  assert(match, "Document upload is invalid.", 400);
  const mimeType = match[1];
  assert(ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType), "Only PDF and image documents are allowed.", 400);
  const buffer = Buffer.from(match[2], 'base64');
  assert(buffer.length > 0, "Document upload is empty.", 400);
  assert(buffer.length <= MAX_DOCUMENT_BYTES, "Each document must be 5MB or smaller.", 400);
  return { buffer, mimeType };
}

function extensionFor(mimeType, originalName = '') {
  const ext = path.extname(originalName).toLowerCase();
  if (['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}
function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `ADM-${code}`;
}

export class AdmissionService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }


  async saveDocuments(client, applicationId, documents = []) {
    if (!Array.isArray(documents) || documents.length === 0) return [];
    await fs.mkdir(DOCUMENT_STORAGE_DIR, { recursive: true });
    const saved = [];
    for (const document of documents) {
      const documentType = String(document.documentType || '').trim();
      assert(DOCUMENT_TYPES.has(documentType), "Invalid admission document type.", 400);
      const originalName = String(document.name || `${documentType}.pdf`).replace(/[\\/]/g, '_').slice(0, 160);
      const { buffer, mimeType } = decodeDocument(document);
      const id = createId('admdoc');
      const storageKey = `${id}${extensionFor(mimeType, originalName)}`;
      const storagePath = path.join(DOCUMENT_STORAGE_DIR, storageKey);
      await fs.writeFile(storagePath, buffer, { flag: 'wx' });
      saved.push(await insertApplicationDocument(client, {
        id,
        applicationId,
        documentType,
        originalName,
        mimeType,
        fileSize: buffer.length,
        storageKey,
      }));
    }
    return saved;
  }

  sanitizeDocuments(documents = [], includeStorage = false) {
    return documents.map((document) => {
      const { storageKey, ...safe } = document;
      return includeStorage ? document : safe;
    });
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
    assert(!photoData || photoData.length <= MAX_PHOTO_BASE64_LENGTH, "Photo is too large - please use a smaller image.", 400);

    const schoolSlug = (input.schoolSlug || "").trim();
    assert(schoolSlug, "Missing school reference — please apply from the school's website.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const tenant = await findTenantBySlug(client, schoolSlug);
      assert(tenant && tenant.status === "active", "This school is not currently accepting applications.", 400);
      const tenantId = tenant.id;

      let referenceCode = null;
      for (let attempt = 0; attempt < 5 && !referenceCode; attempt++) {
        const candidate = generateCode();
        if (!(await referenceCodeExists(client, candidate))) referenceCode = candidate;
      }
      assert(referenceCode, "Could not generate a reference code - please try again.", 500);

      const application = await insertApplication(client, {
        id: createId("adm"),
        tenantId,
        referenceCode,
        applicantName, dateOfBirth, gender, applyingForClass,
        guardianName, guardianPhone, guardianEmail, previousSchool, photoData,
      });
      const documents = await this.saveDocuments(client, application.id, input.documents || []);
      return { ...application, documents: this.sanitizeDocuments(documents) };
    });
  }

  async checkStatus(referenceCode) {
    const cleanCode = (referenceCode || "").trim().toUpperCase();
    assert(cleanCode, "Reference code is required.", 400);

    return this.databaseManager.withClient(async (client) => {
      const application = await findApplicationByReference(client, cleanCode);
      assert(application, "No application found with that reference code.", 404);
      const documents = await listApplicationDocuments(client, application.id);
      return { ...application, documents: this.sanitizeDocuments(documents) };
    });
  }

  async listAll(status, actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listApplications(client, status, actor.tenantId));
  }

  async getById(id, actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient(async (client) => {
      const application = await findApplicationById(client, id);
      assert(application && application.tenantId === actor.tenantId, "Application not found.", 404);
      const documents = await listApplicationDocuments(client, id);
      return { ...application, documents: this.sanitizeDocuments(documents) };
    });
  }

  async updateStatus(id, input, actor) {
    assert(actor.tenantId, "No active organization.", 403);
    const status = APPLICATION_STATUSES.includes(input.status) ? input.status : null;

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findApplicationById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Application not found.", 404);

      const application = await updateApplicationStatus(client, {
        id,
        status: status || existing.status,
        notes: input.notes ?? existing.notes,
        admissionTestDate: input.admissionTestDate ?? existing.admissionTestDate,
      });
      const documents = await listApplicationDocuments(client, id);
      return { ...application, documents: this.sanitizeDocuments(documents) };
    });
  }

  // Documents don't carry their own tenant_id — ownership is verified through
  // the parent application, which is the tenant-scoped record.
  async assertDocumentInTenant(client, document, actor) {
    assert(document, "Admission document not found.", 404);
    assert(actor.tenantId, "No active organization.", 403);
    const application = await findApplicationById(client, document.applicationId);
    assert(application && application.tenantId === actor.tenantId, "Admission document not found.", 404);
  }

  async updateDocumentVerification(documentId, input, actor) {
    const verificationStatus = DOCUMENT_STATUSES.has(input.verificationStatus) ? input.verificationStatus : null;
    assert(verificationStatus, "Invalid document verification status.", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const document = await findApplicationDocument(client, documentId);
      await this.assertDocumentInTenant(client, document, actor);
      return updateApplicationDocumentVerification(client, {
        id: documentId,
        verificationStatus,
        verificationNotes: input.verificationNotes || '',
        verifiedBy: actor.id,
      });
    });
  }

  async getDocumentForDownload(documentId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const document = await findApplicationDocument(client, documentId);
      await this.assertDocumentInTenant(client, document, actor);
      const filePath = path.join(DOCUMENT_STORAGE_DIR, document.storageKey);
      const resolved = path.resolve(filePath);
      assert(resolved.startsWith(path.resolve(DOCUMENT_STORAGE_DIR)), "Invalid document path.", 400);
      await fs.access(resolved);
      return { ...document, filePath: resolved };
    });
  }
}
