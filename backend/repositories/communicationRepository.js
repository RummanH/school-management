export function mapThread(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    topic: row.topic || '',
    studentUserId: row.student_user_id || null,
    studentName: row.student_name || '',
    guardianUserId: row.guardian_user_id || null,
    guardianName: row.guardian_name || '',
    teacherUserId: row.teacher_user_id || null,
    teacherName: row.teacher_name || '',
    adminUserId: row.admin_user_id || null,
    adminName: row.admin_name || '',
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessage: row.last_message || '',
    lastMessageAt: row.last_message_at || null,
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
    recipientUserId: row.recipient_user_id,
    recipientName: row.recipient_name || '',
    recipientRole: row.recipient_role || '',
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    status: row.read_at ? 'read' : 'unread',
  };
}

export async function listCommunicationThreads(client, actor) {
  const result = await client.query(
    `SELECT ct.*,
            su.name AS student_name,
            gu.name AS guardian_name,
            tu.name AS teacher_name,
            au.name AS admin_name,
            lm.body AS last_message,
            lm.created_at AS last_message_at,
            COUNT(cm.id)::int AS message_count,
            COUNT(cm.id) FILTER (WHERE cm.recipient_user_id = $2 AND cm.read_at IS NULL)::int AS unread_count
       FROM communication_threads ct
       LEFT JOIN users su ON su.id = ct.student_user_id
       LEFT JOIN users gu ON gu.id = ct.guardian_user_id
       LEFT JOIN users tu ON tu.id = ct.teacher_user_id
       LEFT JOIN users au ON au.id = ct.admin_user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at
           FROM communication_messages
          WHERE thread_id = ct.id
          ORDER BY created_at DESC
          LIMIT 1
       ) lm ON true
       LEFT JOIN communication_messages cm ON cm.thread_id = ct.id
      WHERE ct.tenant_id = $1
        AND (
          $3::text IN ('admin', 'system_developer')
          OR ct.guardian_user_id = $2
          OR ct.teacher_user_id = $2
          OR ct.admin_user_id = $2
        )
      GROUP BY ct.id, su.name, gu.name, tu.name, au.name, lm.body, lm.created_at
      ORDER BY COALESCE(lm.created_at, ct.updated_at) DESC`,
    [actor.tenantId, actor.id, actor.role],
  );
  return result.rows.map(mapThread);
}

export async function findCommunicationThread(client, id) {
  const result = await client.query(
    `SELECT ct.*,
            su.name AS student_name,
            gu.name AS guardian_name,
            tu.name AS teacher_name,
            au.name AS admin_name,
            '' AS last_message,
            NULL AS last_message_at,
            0 AS unread_count,
            0 AS message_count
       FROM communication_threads ct
       LEFT JOIN users su ON su.id = ct.student_user_id
       LEFT JOIN users gu ON gu.id = ct.guardian_user_id
       LEFT JOIN users tu ON tu.id = ct.teacher_user_id
       LEFT JOIN users au ON au.id = ct.admin_user_id
      WHERE ct.id = $1
      LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapThread(result.rows[0]) : null;
}

export async function insertCommunicationThread(client, data) {
  const result = await client.query(
    `INSERT INTO communication_threads
       (id, tenant_id, topic, student_user_id, guardian_user_id, teacher_user_id, admin_user_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [data.id, data.tenantId, data.topic || '', data.studentUserId || null, data.guardianUserId || null,
     data.teacherUserId || null, data.adminUserId || null, data.createdBy],
  );
  return result.rows[0];
}

export async function insertCommunicationMessage(client, data) {
  const result = await client.query(
    `INSERT INTO communication_messages
       (id, thread_id, tenant_id, sender_user_id, recipient_user_id, body)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [data.id, data.threadId, data.tenantId, data.senderUserId, data.recipientUserId, data.body],
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
       JOIN users ru ON ru.id = cm.recipient_user_id
      WHERE cm.thread_id = $1
      ORDER BY cm.created_at ASC`,
    [threadId],
  );
  return result.rows.map(mapMessage);
}

export async function markThreadMessagesRead(client, threadId, userId) {
  await client.query(
    `UPDATE communication_messages
        SET read_at = COALESCE(read_at, NOW())
      WHERE thread_id = $1 AND recipient_user_id = $2 AND read_at IS NULL`,
    [threadId, userId],
  );
}

export async function listMessageRecipients(client, tenantId, role) {
  const result = await client.query(
    `SELECT id, name, email, role
       FROM users
      WHERE tenant_id = $1
        AND status = 'active'
        AND role = $2
      ORDER BY name ASC`,
    [tenantId, role],
  );
  return result.rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role }));
}