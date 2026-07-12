import fs from "node:fs/promises";
import path from "node:path";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { publicUploadsPath } from "../config/paths.js";
import { findUserById } from "../repositories/userRepository.js";
import { isWardOfGuardian } from "../repositories/guardianRepository.js";
import {
  findCommunicationThread,
  insertCommunicationMessage,
  insertCommunicationThread,
  listCommunicationMessages,
  listCommunicationThreads,
  listMessageRecipients,
  markThreadMessagesRead,
} from "../repositories/communicationRepository.js";

function cleanText(value) {
  return String(value || '').trim();
}

function assertTenant(actor) {
  assert(actor.tenantId, "No active organization.", 403);
}

const ATTACHMENT_DATA_URL_PATTERN = /^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/;
const ATTACHMENT_MIME_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

async function saveMessageAttachment(dataUrl, originalName) {
  const match = ATTACHMENT_DATA_URL_PATTERN.exec(String(dataUrl || '').trim());
  assert(match, "Attachment is invalid.", 400);
  const mimeType = match[1].toLowerCase();
  const extension = ATTACHMENT_MIME_EXTENSIONS[mimeType];
  assert(extension, "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, GIF, TXT, DOC, DOCX.", 400);
  const buffer = Buffer.from(match[2], "base64");
  assert(buffer.length > 0, "Attachment is empty.", 400);
  assert(buffer.length <= MAX_ATTACHMENT_BYTES, "Attachment must be 8MB or smaller.", 400);

  const dir = path.join(publicUploadsPath, "communication");
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${createId("commatt")}.${extension}`;
  await fs.writeFile(path.join(dir, fileName), buffer);

  return {
    attachmentUrl: `/uploads/communication/${fileName}`,
    attachmentName: cleanText(originalName) || fileName,
    attachmentMimeType: mimeType,
    attachmentSize: buffer.length,
  };
}

export class CommunicationService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  listThreads(actor) {
    assertTenant(actor);
    return this.databaseManager.withClient((client) => listCommunicationThreads(client, actor));
  }

  async getThread(actor, threadId) {
    assertTenant(actor);
    return this.databaseManager.withTransaction(async (client) => {
      const thread = await findCommunicationThread(client, threadId);
      assert(thread && thread.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(canAccessThread(actor, thread), "You do not have permission to view this conversation.", 403);
      await markThreadMessagesRead(client, threadId, actor.id);
      const messages = await listCommunicationMessages(client, threadId);
      return { thread, messages };
    });
  }

  async createThread(actor, input) {
    assertTenant(actor);
    const recipientUserId = cleanText(input.recipientUserId);
    const studentUserId = cleanText(input.studentUserId) || null;
    const topic = cleanText(input.topic) || "Direct message";
    const body = cleanText(input.body);
    assert(recipientUserId, "Recipient is required.", 400);
    assert(body || input.attachment, "Message or attachment is required.", 400);

    const attachmentData = input.attachment
      ? await saveMessageAttachment(input.attachment, input.attachmentName)
      : {};

    return this.databaseManager.withTransaction(async (client) => {
      const recipient = await findUserById(client, recipientUserId);
      assert(recipient && recipient.tenant_id === actor.tenantId && recipient.status === 'active', "Recipient not found.", 404);
      assert(recipient.id !== actor.id, "Choose another recipient.", 400);

      const data = await buildThreadData(client, actor, recipient, { studentUserId, topic });
      const threadRow = await insertCommunicationThread(client, {
        id: createId("comm_thread"),
        tenantId: actor.tenantId,
        createdBy: actor.id,
        ...data,
      });
      await insertCommunicationMessage(client, {
        id: createId("comm_msg"),
        threadId: threadRow.id,
        tenantId: actor.tenantId,
        senderUserId: actor.id,
        recipientUserId: recipient.id,
        body,
        ...attachmentData,
      });
      const thread = await findCommunicationThread(client, threadRow.id);
      const messages = await listCommunicationMessages(client, threadRow.id);
      return { thread, messages };
    });
  }

  async reply(actor, threadId, input) {
    assertTenant(actor);
    const body = cleanText(input.body);
    assert(body || input.attachment, "Message or attachment is required.", 400);

    const attachmentData = input.attachment
      ? await saveMessageAttachment(input.attachment, input.attachmentName)
      : {};

    return this.databaseManager.withTransaction(async (client) => {
      const thread = await findCommunicationThread(client, threadId);
      assert(thread && thread.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(canAccessThread(actor, thread), "You do not have permission to reply to this conversation.", 403);
      const recipientUserId = recipientForReply(actor, thread);
      assert(recipientUserId, "No recipient is available for this conversation.", 400);
      await insertCommunicationMessage(client, {
        id: createId("comm_msg"),
        threadId,
        tenantId: actor.tenantId,
        senderUserId: actor.id,
        recipientUserId,
        body,
        ...attachmentData,
      });
      await markThreadMessagesRead(client, threadId, actor.id);
      const messages = await listCommunicationMessages(client, threadId);
      return { thread, messages };
    });
  }

  async recipients(actor, role) {
    assertTenant(actor);
    return this.databaseManager.withClient((client) => listMessageRecipients(client, actor.tenantId, actor.id, role || null));
  }
}

async function buildThreadData(client, actor, recipient, { studentUserId, topic }) {
  if (studentUserId) {
    const directMatch = actor.id === studentUserId || recipient.id === studentUserId;
    if (!directMatch) {
      const guardian = actor.role === 'guardian' ? actor : recipient.role === 'guardian' ? recipient : null;
      assert(guardian, "That student isn't linked to either participant.", 400);
      const allowed = await isWardOfGuardian(client, guardian.id, studentUserId);
      assert(allowed, "Guardian is not linked to that student.", 400);
    }
  }

  return { topic, studentUserId: studentUserId || null, participantOneUserId: actor.id, participantTwoUserId: recipient.id };
}

function canAccessThread(actor, thread) {
  if (actor.role === 'admin' || actor.role === 'system_developer') return actor.tenantId === thread.tenantId;
  return [thread.participantOneUserId, thread.participantTwoUserId].includes(actor.id);
}

function recipientForReply(actor, thread) {
  const parties = [thread.participantOneUserId, thread.participantTwoUserId];
  return parties.find((id) => id && id !== actor.id) || null;
}