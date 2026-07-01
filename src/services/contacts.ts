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

export async function insertPendingContact(
  email: string,
  name: string | null,
  consent: ConsentInfo
): Promise<{ id: number; confirmation_token: string } | null> {
  const { rows } = await pool.query(
    `INSERT INTO contacts (email, name, source, status, consent_source, consent_ip, consent_timestamp)
     VALUES ($1, $2, $3, 'pending', $4, $5, now())
     ON CONFLICT (email) DO NOTHING
     RETURNING id, confirmation_token`,
    [email, name, consent.source, consent.source, consent.ip ?? null]
  );
  return rows[0] ?? null;
}

export async function confirmContact(
  token: string
): Promise<{ id: number } | null> {
  const { rows } = await pool.query(
    `UPDATE contacts
     SET status = 'active', confirmation_token = NULL
     WHERE confirmation_token = $1 AND status = 'pending'
     RETURNING id`,
    [token]
  );
  if (rows[0]) {
    await pool.query(
      `INSERT INTO events (contact_id, type) VALUES ($1, 'confirm')`,
      [rows[0].id]
    );
  }
  return rows[0] ?? null;
}

export async function suppressContact(
  email: string,
  type: "bounce" | "complaint",
  metadata: unknown
) {
  const status = type === "bounce" ? "bounced" : "complained";
  const { rows } = await pool.query(
    `UPDATE contacts SET status = $1 WHERE email = $2 RETURNING id`,
    [status, email]
  );
  if (rows[0]) {
    await pool.query(
      `INSERT INTO events (contact_id, type, metadata) VALUES ($1, $2, $3)`,
      [rows[0].id, type, metadata]
    );
  }
  return rows[0] ?? null;
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
