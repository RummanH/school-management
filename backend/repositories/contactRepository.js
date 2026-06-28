export function insertContactMessage(client, { id, name, phone, message }) {
  return client.query(
    `INSERT INTO contact_messages (id, name, phone, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, name, phone, message],
  );
}
