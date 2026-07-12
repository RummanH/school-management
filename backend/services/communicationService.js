import fs from "node:fs/promises";
import path from "node:path";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { publicUploadsPath } from "../config/paths.js";
import { findUserById } from "../repositories/userRepository.js";
import { isWardOfGuardian } from "../repositories/guardianRepository.js";
import {
  addThreadParticipants,
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
  constructor(databaseManager, realtime) {
    this.databaseManager = databaseManager;
    this.realtime = realtime;
  }

  // Includes the sender's own other tabs/devices, not just the recipients —
  // the frontend dedupes by message id, so this is safe and keeps multiple
  // open tabs for the same user in sync too.
  broadcastNewMessage(thread, message) {
    for (const p of thread.participants || []) {
      this.realtime?.emitToUser(p.userId, "message:new", { thread, message });
    }
  }

  broadcastThreadRead(thread, readByUserId) {
    for (const p of thread.participants || []) {
      if (p.userId === readByUserId) continue;
      this.realtime?.emitToUser(p.userId, "thread:read", { threadId: thread.id, readByUserId });
    }
  }

  listThreads(actor) {
    assertTenant(actor);
    return this.databaseManager.withClient((client) => listCommunicationThreads(client, actor));
  }

  async getThread(actor, threadId) {
    assertTenant(actor);
    let didMarkRead = false;
    const result = await this.databaseManager.withTransaction(async (client) => {
      const thread = await findCommunicationThread(client, threadId);
      assert(thread && thread.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(canAccessThread(actor, thread), "You do not have permission to view this conversation.", 403);
      didMarkRead = await markThreadMessagesRead(client, threadId, actor.id);
      const messages = await listCommunicationMessages(client, threadId);
      return { thread, messages };
    });
    if (didMarkRead) this.broadcastThreadRead(result.thread, actor.id);
    return result;
  }

  async createThread(actor, input) {
    assertTenant(actor);
    const recipientUserIds = [...new Set(
      (Array.isArray(input.recipientUserIds) && input.recipientUserIds.length
        ? input.recipientUserIds
        : [input.recipientUserId]
      ).map(cleanText).filter(Boolean),
    )];
    const studentUserId = cleanText(input.studentUserId) || null;
    const body = cleanText(input.body);
    assert(recipientUserIds.length > 0, "At least one recipient is required.", 400);
    assert(body || input.attachment, "Message or attachment is required.", 400);

    const attachmentData = input.attachment
      ? await saveMessageAttachment(input.attachment, input.attachmentName)
      : {};

    const result = await this.databaseManager.withTransaction(async (client) => {
      const recipients = [];
      for (const recipientUserId of recipientUserIds) {
        const recipient = await findUserById(client, recipientUserId);
        assert(recipient && recipient.tenant_id === actor.tenantId && recipient.status === 'active', "Recipient not found.", 404);
        assert(recipient.id !== actor.id, "Choose another recipient.", 400);
        recipients.push(recipient);
      }

      const isGroup = recipients.length > 1;
      const topic = cleanText(input.topic) || (isGroup ? "Group message" : "Direct message");
      await validateStudentTag(client, [{ id: actor.id, role: actor.role }, ...recipients], studentUserId);

      const threadRow = await insertCommunicationThread(client, {
        id: createId("comm_thread"),
        tenantId: actor.tenantId,
        createdBy: actor.id,
        topic,
        studentUserId,
        participantOneUserId: actor.id,
        participantTwoUserId: recipients[0].id,
        isGroup,
      });
      await addThreadParticipants(client, [actor, ...recipients].map((p) => ({
        id: createId("ctp"), threadId: threadRow.id, userId: p.id,
      })));
      await insertCommunicationMessage(client, {
        id: createId("comm_msg"),
        threadId: threadRow.id,
        tenantId: actor.tenantId,
        senderUserId: actor.id,
        recipientUserId: isGroup ? null : recipients[0].id,
        body,
        ...attachmentData,
      });
      const thread = await findCommunicationThread(client, threadRow.id);
      const messages = await listCommunicationMessages(client, threadRow.id);
      return { thread, messages };
    });
    this.broadcastNewMessage(result.thread, result.messages[result.messages.length - 1]);
    return result;
  }

  async reply(actor, threadId, input) {
    assertTenant(actor);
    const body = cleanText(input.body);
    assert(body || input.attachment, "Message or attachment is required.", 400);

    const attachmentData = input.attachment
      ? await saveMessageAttachment(input.attachment, input.attachmentName)
      : {};

    const result = await this.databaseManager.withTransaction(async (client) => {
      const thread = await findCommunicationThread(client, threadId);
      assert(thread && thread.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(canAccessThread(actor, thread), "You do not have permission to reply to this conversation.", 403);
      const recipientUserId = recipientForReply(actor, thread);
      assert(thread.isGroup || recipientUserId, "No recipient is available for this conversation.", 400);
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
    this.broadcastNewMessage(result.thread, result.messages[result.messages.length - 1]);
    return result;
  }

  async recipients(actor, role) {
    assertTenant(actor);
    return this.databaseManager.withClient((client) => listMessageRecipients(client, actor.tenantId, actor.id, role || null));
  }
}

// participants: [{ id, role }, ...] — every person who will be in the thread.
async function validateStudentTag(client, participants, studentUserId) {
  if (!studentUserId) return;
  if (participants.some((p) => p.id === studentUserId)) return;
  const guardian = participants.find((p) => p.role === 'guardian');
  assert(guardian, "That student isn't linked to any participant.", 400);
  const allowed = await isWardOfGuardian(client, guardian.id, studentUserId);
  assert(allowed, "Guardian is not linked to that student.", 400);
}

function canAccessThread(actor, thread) {
  if (actor.role === 'admin' || actor.role === 'system_developer') return actor.tenantId === thread.tenantId;
  return (thread.participants || []).some((p) => p.userId === actor.id);
}

// Only meaningful for 1:1 threads — group replies carry no single recipient
// (recipient_user_id stays null; see communication_message_reads for group reads).
function recipientForReply(actor, thread) {
  if (thread.isGroup) return null;
  const parties = [thread.participantOneUserId, thread.participantTwoUserId];
  return parties.find((id) => id && id !== actor.id) || null;
}