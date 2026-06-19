import { pool } from "../db";

export interface ConsentInfo {
  source: string;
  ip?: string | null;
}

export async function upsertActiveContact(
  email: string,
  name: string | null,
  consent: ConsentInfo
) {
  const { rows } = await pool.query(
    `INSERT INTO contacts (email, name, source, status, consent_source, consent_ip, consent_timestamp)
     VALUES ($1, $2, $3, 'active', $4, $5, now())
     ON CONFLICT (email) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, contacts.name),
       status = 'active'
     RETURNING id, unsubscribe_token`,
    [email, name, consent.source, consent.source, consent.ip ?? null]
  );
  return rows[0];
}

export async function unsubscribeByToken(token: string) {
  const { rows } = await pool.query(
    `UPDATE contacts SET status = 'unsubscribed' WHERE unsubscribe_token = $1 RETURNING id`,
    [token]
  );
  if (rows[0]) {
    await pool.query(
      `INSERT INTO events (contact_id, type) VALUES ($1, 'unsubscribe')`,
      [rows[0].id]
    );
  }
  return rows[0] ?? null;
}
