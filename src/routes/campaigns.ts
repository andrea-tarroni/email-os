import { Router } from "express";
import { pool } from "../db";
import { sendCampaignEmail } from "../services/ses";
import { buildSortClause } from "../services/sorting";

export const campaignsRouter = Router();

const SEND_DELAY_MS = 200; // simple pacing; no queue infra needed at this volume
const SORTABLE_COLUMNS = ["subject", "status", "created_at", "sent_at"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

campaignsRouter.get("/", async (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const sort = buildSortClause(
    typeof req.query.sort === "string" ? req.query.sort : undefined,
    typeof req.query.dir === "string" ? req.query.dir : undefined,
    SORTABLE_COLUMNS,
    "created_at"
  );

  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE subject ILIKE $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT id, subject, status, created_at, sent_at FROM campaigns ${where} ORDER BY ${sort.orderBy}`,
    params
  );
  res.render("campaigns/list", { campaigns: rows, search, sort });
});

campaignsRouter.get("/:id", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).send("campaign not found");
  res.render("campaigns/show", { campaign: rows[0] });
});

campaignsRouter.post("/:id/send", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [req.params.id]);
  const campaign = rows[0];
  if (!campaign) return res.status(404).send("campaign not found");
  if (campaign.status !== "draft") return res.status(400).send("campaign already sent");

  const { rows: contacts } = await pool.query(
    `SELECT id, email, unsubscribe_token FROM contacts WHERE status = 'active'`
  );

  await pool.query(`UPDATE campaigns SET status = 'sending' WHERE id = $1`, [campaign.id]);

  for (const contact of contacts) {
    await sendCampaignEmail(contact, campaign.subject, campaign.html, campaign.text);
    await pool.query(
      `INSERT INTO events (contact_id, campaign_id, type) VALUES ($1, $2, 'sent')`,
      [contact.id, campaign.id]
    );
    await delay(SEND_DELAY_MS);
  }

  await pool.query(
    `UPDATE campaigns SET status = 'sent', sent_at = now() WHERE id = $1`,
    [campaign.id]
  );

  res.redirect(`/campaigns/${campaign.id}`);
});
