import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
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
    assert(body, "Message is required.", 400);

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
      });
      const thread = await findCommunicationThread(client, threadRow.id);
      const messages = await listCommunicationMessages(client, threadRow.id);
      return { thread, messages };
    });
  }

  async reply(actor, threadId, input) {
    assertTenant(actor);
    const body = cleanText(input.body);
    assert(body, "Message is required.", 400);

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
      });
      await markThreadMessagesRead(client, threadId, actor.id);
      const messages = await listCommunicationMessages(client, threadId);
      return { thread, messages };
    });
  }

  async recipients(actor, role) {
    assertTenant(actor);
    const allowed = allowedRecipientRoles(actor.role);
    assert(allowed.includes(role), "This recipient type is not allowed.", 403);
    return this.databaseManager.withClient((client) => listMessageRecipients(client, actor.tenantId, role));
  }
}

async function buildThreadData(client, actor, recipient, { studentUserId, topic }) {
  const data = { topic, studentUserId: studentUserId || null, guardianUserId: null, teacherUserId: null, adminUserId: null };

  if (actor.role === 'guardian') {
    assert(['teacher', 'admin'].includes(recipient.role), "Guardians can message teachers or admins.", 403);
    if (studentUserId) {
      const allowed = await isWardOfGuardian(client, actor.id, studentUserId);
      assert(allowed, "Ward not found.", 404);
    }
    data.guardianUserId = actor.id;
    if (recipient.role === 'teacher') data.teacherUserId = recipient.id;
    else data.adminUserId = recipient.id;
    return data;
  }

  if (actor.role === 'teacher') {
    assert(recipient.role === 'guardian', "Teachers can message guardians.", 403);
    if (studentUserId) {
      const allowed = await isWardOfGuardian(client, recipient.id, studentUserId);
      assert(allowed, "Guardian is not linked to that student.", 400);
    }
    data.guardianUserId = recipient.id;
    data.teacherUserId = actor.id;
    return data;
  }

  if (actor.role === 'admin' || actor.role === 'system_developer') {
    assert(recipient.role === 'guardian', "Admins can message guardians.", 403);
    if (studentUserId) {
      const allowed = await isWardOfGuardian(client, recipient.id, studentUserId);
      assert(allowed, "Guardian is not linked to that student.", 400);
    }
    data.guardianUserId = recipient.id;
    data.adminUserId = actor.id;
    return data;
  }

  assert(false, "Messaging is available for guardians, teachers, and admins.", 403);
}

function canAccessThread(actor, thread) {
  if (actor.role === 'admin' || actor.role === 'system_developer') return actor.tenantId === thread.tenantId;
  return [thread.guardianUserId, thread.teacherUserId, thread.adminUserId].includes(actor.id);
}

function recipientForReply(actor, thread) {
  if (actor.role === 'guardian') return thread.teacherUserId || thread.adminUserId;
  if (actor.role === 'teacher') return thread.guardianUserId;
  if (actor.role === 'admin' || actor.role === 'system_developer') return thread.guardianUserId;
  return null;
}

function allowedRecipientRoles(role) {
  if (role === 'guardian') return ['teacher', 'admin'];
  if (role === 'teacher') return ['guardian'];
  if (role === 'admin' || role === 'system_developer') return ['guardian'];
  return [];
}