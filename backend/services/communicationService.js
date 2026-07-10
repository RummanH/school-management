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

// communication_threads has one column per role (guardian/teacher/admin), so a
// thread can hold at most one participant of each — same-role pairs (two
// teachers, two admins) have nowhere to go without a schema change. Cross-role
// pairing among these three is otherwise fully open.
const CHAT_ROLES = ['admin', 'teacher', 'guardian'];

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
  assert(CHAT_ROLES.includes(actor.role), "Messaging is available for admins, teachers, and guardians.", 403);
  assert(CHAT_ROLES.includes(recipient.role), "Recipient must be an admin, teacher, or guardian.", 400);
  assert(actor.role !== recipient.role, `Direct messaging between two ${actor.role}s isn't supported yet — try a different recipient type.`, 400);

  if (studentUserId) {
    const guardianId = actor.role === 'guardian' ? actor.id : recipient.role === 'guardian' ? recipient.id : null;
    assert(guardianId, "A student can only be linked to a conversation that includes that student's guardian.", 400);
    const allowed = await isWardOfGuardian(client, guardianId, studentUserId);
    assert(allowed, "Guardian is not linked to that student.", 400);
  }

  const data = { topic, studentUserId: studentUserId || null, guardianUserId: null, teacherUserId: null, adminUserId: null };
  data[`${actor.role}UserId`] = actor.id;
  data[`${recipient.role}UserId`] = recipient.id;
  return data;
}

function canAccessThread(actor, thread) {
  if (actor.role === 'admin' || actor.role === 'system_developer') return actor.tenantId === thread.tenantId;
  return [thread.guardianUserId, thread.teacherUserId, thread.adminUserId].includes(actor.id);
}

function recipientForReply(actor, thread) {
  const parties = [thread.guardianUserId, thread.teacherUserId, thread.adminUserId];
  return parties.find((id) => id && id !== actor.id) || null;
}

function allowedRecipientRoles(role) {
  return CHAT_ROLES.includes(role) ? CHAT_ROLES.filter((r) => r !== role) : [];
}