function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function mapTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    direction: row.direction,
    sourceType: row.source_type,
    sourceId: row.source_id,
    amount: toMoney(row.amount),
    method: row.method,
    category: row.category || '',
    transactionDate: row.transaction_date,
    recordedBy: row.recorded_by,
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

// Insert-once: fee payments and expenses are never edited in place, so a
// duplicate post (e.g. a retried transaction) is simply ignored.
export async function insertTransaction(client, data) {
  const result = await client.query(
    `INSERT INTO finance_transactions
       (id, tenant_id, direction, source_type, source_id, amount, method, category, transaction_date, recorded_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (source_type, source_id) DO NOTHING
     RETURNING *`,
    [data.id, data.tenantId, data.direction, data.sourceType, data.sourceId, data.amount,
     data.method || 'cash', data.category || '', data.transactionDate, data.recordedBy || null, data.notes || ''],
  );
  return mapTransaction(result.rows[0]);
}

// Payroll records can be re-saved after being marked paid (amount corrections),
// so that source keeps its ledger row in sync instead of only posting once.
export async function upsertTransaction(client, data) {
  const result = await client.query(
    `INSERT INTO finance_transactions
       (id, tenant_id, direction, source_type, source_id, amount, method, category, transaction_date, recorded_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (source_type, source_id) DO UPDATE SET
       amount = EXCLUDED.amount, method = EXCLUDED.method, category = EXCLUDED.category,
       transaction_date = EXCLUDED.transaction_date, notes = EXCLUDED.notes
     RETURNING *`,
    [data.id, data.tenantId, data.direction, data.sourceType, data.sourceId, data.amount,
     data.method || 'bank', data.category || '', data.transactionDate, data.recordedBy || null, data.notes || ''],
  );
  return mapTransaction(result.rows[0]);
}

export async function getCashBook(client, tenantId, { from, to, method } = {}) {
  const result = await client.query(
    `SELECT * FROM finance_transactions
      WHERE tenant_id = $1
        AND ($2::text IS NULL OR transaction_date >= $2)
        AND ($3::text IS NULL OR transaction_date <= $3)
        AND ($4::text IS NULL OR method = $4)
      ORDER BY transaction_date DESC, created_at DESC`,
    [tenantId, from || null, to || null, method || null],
  );
  return result.rows.map(mapTransaction);
}

export async function getBalance(client, tenantId) {
  const overall = await client.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0) AS total_in,
       COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS total_out
     FROM finance_transactions WHERE tenant_id = $1`,
    [tenantId],
  );
  const byMethod = await client.query(
    `SELECT method,
            COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0) AS total_in,
            COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS total_out
       FROM finance_transactions
      WHERE tenant_id = $1
      GROUP BY method
      ORDER BY method ASC`,
    [tenantId],
  );
  const totalIn = toMoney(overall.rows[0].total_in);
  const totalOut = toMoney(overall.rows[0].total_out);
  return {
    totalIn,
    totalOut,
    balance: toMoney(totalIn - totalOut),
    byMethod: byMethod.rows.map((row) => ({
      method: row.method,
      totalIn: toMoney(row.total_in),
      totalOut: toMoney(row.total_out),
      balance: toMoney(Number(row.total_in) - Number(row.total_out)),
    })),
  };
}
