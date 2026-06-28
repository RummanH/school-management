export class AdminController {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  getStats = async (_req, res, next) => {
    try {
      const result = await this.databaseManager.withClient((client) =>
        client.query(`
          SELECT
            COUNT(*)::int                                          AS total,
            COUNT(*) FILTER (WHERE status = 'NEW')::int           AS new_count,
            COUNT(*) FILTER (WHERE status = 'READ')::int          AS read_count,
            COUNT(*) FILTER (WHERE status = 'RESOLVED')::int      AS resolved_count
          FROM contact_messages
        `),
      );
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  };

  getContacts = async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const status = req.query.status || null;

      const result = await this.databaseManager.withClient((client) =>
        client.query(
          `SELECT * FROM contact_messages
           WHERE ($1::text IS NULL OR status = $1)
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [status, limit, offset],
        ),
      );
      res.json({ contacts: result.rows });
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req, res, next) => {
    try {
      await this.databaseManager.withTransaction((client) =>
        client.query(
          "UPDATE contact_messages SET status = 'READ' WHERE id = $1",
          [req.params.id],
        ),
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
