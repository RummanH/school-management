export function mapThread(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    topic: row.topic || '',
    isGroup: row.is_group || false,
    studentUserId: row.student_user_id || null,
    studentName: row.student_name || '',
    participantOneUserId: row.participant_one_user_id || null,
    participantOneName: row.participant_one_name || '',
    participantOneRole: row.participant_one_role || '',
    participantTwoUserId: row.participant_two_user_id || null,
    participantTwoName: row.participant_two_name || '',
    participantTwoRole: row.participant_two_role || '',
    participants: row.participants || [],
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessage: row.last_message || '',
    lastMessageAt: row.last_message_at || null,
    lastMessageAttachmentName: row.last_message_attachment_name || null,
    unreadCount: Number(row.unread_count || 0),
    messageCount: Number(row.message_count || 0),
  };
}

export function mapMessage(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    tenantId: row.tenant_id,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name || '',
    senderRole: row.sender_role || '',
    recipientUserId: row.recipient_user_id || null,
    recipientName: row.recipient_name || '',
    recipientRole: row.recipient_role || '',
    body: row.body,
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentMimeType: row.attachment_mime_type || null,
    attachmentSize: row.attachment_size || null,
    readAt: row.read_at,
    createdAt: row.created_at,
    status: row.read_at ? 'read' : 'unread',
  };
}

// Shared LATERAL used everywhere a thread is fetched: the full member list,
// aggregated once per thread rather than N+1 queried per row.
const PARTICIPANTS_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('userId', ctp.user_id, 'name', u.name, 'role', u.role) ORDER BY u.name) AS participants
      FROM communication_thread_participants ctp
      JOIN users u ON u.id = ctp.user_id
     WHERE ctp.thread_id = ct.id
  ) pl ON true
`;

export async function listCommunicationThreads(client, actor) {
  const result = await client.query(
    `SELECT ct.*,
            su.name AS student_name,
            p1.name AS participant_one_name, p1.role AS participant_one_role,
            p2.name AS participant_two_name, p2.role AS participant_two_role,
            lm.body AS last_message,
            lm.created_at AS last_message_at,
            lm.attachment_name AS last_message_attachment_name,
            pl.participants,
            COUNT(DISTINCT cm.id)::int AS message_count,
            COUNT(DISTINCT cm.id) FILTER (
              WHERE cm.sender_user_id != $2
                AND (
                  (ct.is_group = false AND cm.recipient_user_id = $2 AND cm.read_at IS NULL)
                  OR (ct.is_group = true AND NOT EXISTS (
                    SELECT 1 FROM communication_message_reads r WHERE r.message_id = cm.id AND r.user_id = $2
                  ))
                )
            )::int AS unread_count
       FROM communication_threads ct
       LEFT JOIN users su ON su.id = ct.student_user_id
       LEFT JOIN users p1 ON p1.id = ct.participant_one_user_id
       LEFT JOIN users p2 ON p2.id = ct.participant_two_user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at, attachment_name
           FROM communication_messages
          WHERE thread_id = ct.id
          ORDER BY created_at DESC
          LIMIT 1
       ) lm ON true
       LEFT JOIN communication_messages cm ON cm.thread_id = ct.id
       ${PARTICIPANTS_LATERAL}
      WHERE ct.tenant_id = $1
        AND (
          $3::text IN ('admin', 'system_developer')
          OR EXISTS (SELECT 1 FROM communication_thread_participants m WHERE m.thread_id = ct.id AND m.user_id = $2)
        )
      GROUP BY ct.id, su.name, p1.name, p1.role, p2.name, p2.role, lm.body, lm.created_at, lm.attachment_name, pl.participants
      ORDER BY COALESCE(lm.created_at, ct.updated_at) DESC`,
    [actor.tenantId, actor.id, actor.role],
  );
  return result.rows.map(mapThread);
}

export async function findCommunicationThread(client, id) {
  const result = await client.query(
    `SELECT ct.*,
            su.name AS student_name,
            p1.name AS participant_one_name, p1.role AS participant_one_role,
            p2.name AS participant_two_name, p2.role AS participant_two_role,
            '' AS last_message,
            NULL AS last_message_at,
            0 AS unread_count,
            0 AS message_count,
            pl.participants
       FROM communication_threads ct
       LEFT JOIN users su ON su.id = ct.student_user_id
       LEFT JOIN users p1 ON p1.id = ct.participant_one_user_id
       LEFT JOIN users p2 ON p2.id = ct.participant_two_user_id
       ${PARTICIPANTS_LATERAL}
      WHERE ct.id = $1
      LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapThread(result.rows[0]) : null;
}

export async function insertCommunicationThread(client, data) {
  const result = await client.query(
    `INSERT INTO communication_threads
       (id, tenant_id, topic, student_user_id, participant_one_user_id, participant_two_user_id, created_by, is_group)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [data.id, data.tenantId, data.topic || '', data.studentUserId || null,
     data.participantOneUserId, data.participantTwoUserId, data.createdBy, data.isGroup || false],
  );
  return result.rows[0];
}

// rows: [{ id, threadId, userId }]
export async function addThreadParticipants(client, rows) {
  for (const r of rows) {
    await client.query(
      `INSERT INTO communication_thread_participants (id, thread_id, user_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (thread_id, user_id) DO NOTHING`,
      [r.id, r.threadId, r.userId],
    );
  }
}

export async function insertCommunicationMessage(client, data) {
  const result = await client.query(
    `INSERT INTO communication_messages
       (id, thread_id, tenant_id, sender_user_id, recipient_user_id, body, attachment_url, attachment_name, attachment_mime_type, attachment_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [data.id, data.threadId, data.tenantId, data.senderUserId, data.recipientUserId || null, data.body,
     data.attachmentUrl || null, data.attachmentName || null, data.attachmentMimeType || null, data.attachmentSize || null],
  );
  await client.query(`UPDATE communication_threads SET updated_at = NOW() WHERE id = $1`, [data.threadId]);
  return result.rows[0];
}

export async function listCommunicationMessages(client, threadId) {
  const result = await client.query(
    `SELECT cm.*,
            su.name AS sender_name,
            su.role AS sender_role,
            ru.name AS recipient_name,
            ru.role AS recipient_role
       FROM communication_messages cm
       JOIN users su ON su.id = cm.sender_user_id
       LEFT JOIN users ru ON ru.id = cm.recipient_user_id
      WHERE cm.thread_id = $1
      ORDER BY cm.created_at ASC`,
    [threadId],
  );
  return result.rows.map(mapMessage);
}

// Returns true only if this call actually flipped something from unread to
// read. The caller uses that to decide whether a "thread:read" realtime
// event is worth broadcasting — without this guard, two participants with
// the same thread open would re-notify each other on every no-op refetch,
// each triggering the other's client to refetch and re-notify back forever.
export async function markThreadMessagesRead(client, threadId, userId) {
  // 1:1 path (unchanged): single recipient_user_id/read_at pair per message.
  const legacy = await client.query(
    `UPDATE communication_messages
        SET read_at = COALESCE(read_at, NOW())
      WHERE thread_id = $1 AND recipient_user_id = $2 AND read_at IS NULL`,
    [threadId, userId],
  );

  // Group path: every message in the thread not sent by this user gets a
  // per-user read row (idempotent via the unique constraint).
  const group = await client.query(
    `INSERT INTO communication_message_reads (id, message_id, user_id)
       SELECT 'cmr-' || md5(cm.id || '|' || $2::text), cm.id, $2
         FROM communication_messages cm
        WHERE cm.thread_id = $1 AND cm.sender_user_id != $2
     ON CONFLICT (message_id, user_id) DO NOTHING`,
    [threadId, userId],
  );

  return (legacy.rowCount || 0) > 0 || (group.rowCount || 0) > 0;
}

export async function listMessageRecipients(client, tenantId, actorId, role = null) {
  const result = await client.query(
    `SELECT id, name, email, role
       FROM users
      WHERE tenant_id = $1
        AND status = 'active'
        AND id != $2
        AND ($3::text IS NULL OR role = $3)
      ORDER BY role ASC, name ASC`,
    [tenantId, actorId, role],
  );
  return result.rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role }));
}
