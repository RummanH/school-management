import fs from "node:fs/promises";
import path from "node:path";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { publicUploadsPath } from "../config/paths.js";
import { findUserById } from "../repositories/userRepository.js";
import { isWardOfGuardian } from "../repositories/guardianRepository.js";
import {
  addThreadParticipants,
  countThreadParticipants,
  findCommunicationThread,
  findDirectThreadBetween,
  findMessageById,
  insertCommunicationMessage,
  insertCommunicationThread,
  listCommunicationMessages,
  listCommunicationThreads,
  listMessageRecipients,
  listThreadParticipantIds,
  markThreadMessagesRead,
  removeThreadParticipant,
  renameThread,
  softDeleteMessage,
  updateMessageBody,
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
      const { messages, hasMore } = await listCommunicationMessages(client, threadId);
      return { thread, messages, hasMore };
    });
    if (didMarkRead) this.broadcastThreadRead(result.thread, actor.id);
    return result;
  }

  // Pagination: loads the page of messages immediately older than `before`
  // (a message id). No read-marking here — markThreadMessagesRead already
  // covers the whole thread regardless of which page is currently loaded.
  async listOlderMessages(actor, threadId, before) {
    assertTenant(actor);
    assert(before, "A cursor is required.", 400);
    return this.databaseManager.withClient(async (client) => {
      const thread = await findCommunicationThread(client, threadId);
      assert(thread && thread.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(canAccessThread(actor, thread), "You do not have permission to view this conversation.", 403);
      return listCommunicationMessages(client, threadId, { before });
    });
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

      // "New Message" to someone you already have a direct conversation with
      // should continue that conversation, not splinter it into a duplicate
      // thread — group creation is exempt since overlapping membership across
      // separate named groups (e.g. two different class groups) is normal.
      if (!isGroup) {
        const existingThreadId = await findDirectThreadBetween(client, actor.tenantId, actor.id, recipients[0].id);
        if (existingThreadId) {
          await insertCommunicationMessage(client, {
            id: createId("comm_msg"),
            threadId: existingThreadId,
            tenantId: actor.tenantId,
            senderUserId: actor.id,
            recipientUserId: recipients[0].id,
            body,
            ...attachmentData,
          });
          await markThreadMessagesRead(client, existingThreadId, actor.id);
          const thread = await findCommunicationThread(client, existingThreadId);
          const { messages, hasMore } = await listCommunicationMessages(client, existingThreadId);
          return { thread, messages, hasMore };
        }
      }

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
      const { messages, hasMore } = await listCommunicationMessages(client, threadRow.id);
      return { thread, messages, hasMore };
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
      const { messages, hasMore } = await listCommunicationMessages(client, threadId);
      return { thread, messages, hasMore };
    });
    this.broadcastNewMessage(result.thread, result.messages[result.messages.length - 1]);
    return result;
  }

  async recipients(actor, role) {
    assertTenant(actor);
    return this.databaseManager.withClient((client) => listMessageRecipients(client, actor.tenantId, actor.id, role || null));
  }

  broadcastMessageEvent(participantIds, event, payload) {
    for (const uid of participantIds || []) {
      this.realtime?.emitToUser(uid, event, payload);
    }
  }

  async editMessage(actor, messageId, input) {
    assertTenant(actor);
    const body = cleanText(input.body);
    assert(body, "Message body is required.", 400);

    const result = await this.databaseManager.withTransaction(async (client) => {
      const existing = await findMessageById(client, messageId);
      assert(existing && existing.tenant_id === actor.tenantId, "Message not found.", 404);
      assert(existing.sender_user_id === actor.id, "You can only edit your own messages.", 403);
      assert(!existing.deleted_at, "This message has been deleted.", 400);
      assert(!existing.attachment_url, "Attachment messages can't be edited — delete and resend instead.", 400);
      const updated = await updateMessageBody(client, messageId, body);
      const participantIds = await listThreadParticipantIds(client, existing.thread_id);
      return { threadId: existing.thread_id, body: updated.body, editedAt: updated.edited_at, participantIds };
    });
    const payload = { threadId: result.threadId, messageId, body: result.body, editedAt: result.editedAt };
    this.broadcastMessageEvent(result.participantIds, "message:edited", payload);
    return payload;
  }

  async deleteMessage(actor, messageId) {
    assertTenant(actor);
    const result = await this.databaseManager.withTransaction(async (client) => {
      const existing = await findMessageById(client, messageId);
      assert(existing && existing.tenant_id === actor.tenantId, "Message not found.", 404);
      assert(existing.sender_user_id === actor.id, "You can only delete your own messages.", 403);
      assert(!existing.deleted_at, "This message has already been deleted.", 400);
      await softDeleteMessage(client, messageId);
      const participantIds = await listThreadParticipantIds(client, existing.thread_id);
      return { threadId: existing.thread_id, participantIds };
    });
    const payload = { threadId: result.threadId, messageId, deleted: true };
    this.broadcastMessageEvent(result.participantIds, "message:deleted", payload);
    return payload;
  }

  broadcastThreadUpdate(thread) {
    for (const p of thread.participants || []) {
      this.realtime?.emitToUser(p.userId, "thread:updated", { thread });
    }
  }

  async renameGroup(actor, threadId, input) {
    assertTenant(actor);
    const topic = cleanText(input.topic);
    assert(topic, "Group name is required.", 400);
    const thread = await this.databaseManager.withTransaction(async (client) => {
      const existing = await findCommunicationThread(client, threadId);
      assert(existing && existing.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(existing.isGroup, "Only groups can be renamed.", 400);
      assert(canAccessThread(actor, existing), "You do not have permission to manage this group.", 403);
      await renameThread(client, threadId, topic);
      return findCommunicationThread(client, threadId);
    });
    this.broadcastThreadUpdate(thread);
    return { thread };
  }

  async addGroupMembers(actor, threadId, input) {
    assertTenant(actor);
    const userIds = [...new Set((Array.isArray(input.userIds) ? input.userIds : []).map(cleanText).filter(Boolean))];
    assert(userIds.length > 0, "Select at least one person to add.", 400);

    const thread = await this.databaseManager.withTransaction(async (client) => {
      const existing = await findCommunicationThread(client, threadId);
      assert(existing && existing.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(existing.isGroup, "Only groups support adding members.", 400);
      assert(canAccessThread(actor, existing), "You do not have permission to manage this group.", 403);

      const currentIds = new Set((existing.participants || []).map((p) => p.userId));
      const rows = [];
      for (const uid of userIds) {
        if (currentIds.has(uid)) continue;
        const user = await findUserById(client, uid);
        assert(user && user.tenant_id === actor.tenantId && user.status === 'active', "One or more selected people were not found.", 404);
        rows.push({ id: createId("ctp"), threadId, userId: uid });
      }
      if (rows.length) await addThreadParticipants(client, rows);
      return findCommunicationThread(client, threadId);
    });
    this.broadcastThreadUpdate(thread);
    return { thread };
  }

  async removeGroupMember(actor, threadId, memberUserId) {
    assertTenant(actor);
    const cleanMemberId = cleanText(memberUserId);
    assert(cleanMemberId, "Member is required.", 400);

    const thread = await this.databaseManager.withTransaction(async (client) => {
      const existing = await findCommunicationThread(client, threadId);
      assert(existing && existing.tenantId === actor.tenantId, "Conversation not found.", 404);
      assert(existing.isGroup, "Only groups support removing members.", 400);
      assert(canAccessThread(actor, existing), "You do not have permission to manage this group.", 403);
      const memberCount = await countThreadParticipants(client, threadId);
      assert(memberCount > 1, "A group needs at least one member.", 400);
      await removeThreadParticipant(client, threadId, cleanMemberId);
      return findCommunicationThread(client, threadId);
    });
    // The removed member is no longer in thread.participants, so the normal
    // broadcast loop below would skip telling them — do that explicitly so
    // their client can drop the thread from view.
    this.realtime?.emitToUser(cleanMemberId, "thread:removed", { threadId });
    this.broadcastThreadUpdate(thread);
    return { thread };
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