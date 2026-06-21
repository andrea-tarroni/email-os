import { Router } from "express";
import { pool } from "../db";
import { upsertActiveContact } from "../services/contacts";
import { buildSortClause } from "../services/sorting";

export const contactsRouter = Router();

const SORTABLE_COLUMNS = ["email", "name", "status", "created_at"];

contactsRouter.get("/", async (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const sort = buildSortClause(
    typeof req.query.sort === "string" ? req.query.sort : undefined,
    typeof req.query.dir === "string" ? req.query.dir : undefined,
    SORTABLE_COLUMNS,
    "created_at"
  );

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (statusFilter) {
    params.push(statusFilter);
    conditions.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(email ILIKE $${params.length} OR name ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT id, email, name, source, status, created_at FROM contacts ${where} ORDER BY ${sort.orderBy}`,
    params
  );
  const counts = await pool.query(
    `SELECT status, count(*) FROM contacts GROUP BY status`
  );
  res.render("contacts/list", {
    contacts: rows,
    counts: counts.rows,
    statusFilter,
    search,
    sort,
  });
});

contactsRouter.get("/new", (_req, res) => {
  res.render("contacts/new");
});

contactsRouter.post("/", async (req, res) => {
  const { email, name } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).send("valid email is required");
  }

  await upsertActiveContact(email.trim().toLowerCase(), name?.trim() || null, {
    source: "manual",
    ip: req.ip,
  });

  res.redirect("/contacts");
});

contactsRouter.get("/:id", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM contacts WHERE id = $1`, [req.params.id]);
  const contact = rows[0];
  if (!contact) return res.status(404).send("contact not found");

  const events = await pool.query(
    `SELECT type, campaign_id, sequence_step_id, url, created_at FROM events WHERE contact_id = $1 ORDER BY created_at DESC`,
    [contact.id]
  );
  const tags = await pool.query(
    `SELECT t.id, t.name FROM tags t
     JOIN contact_tags ct ON ct.tag_id = t.id
     WHERE ct.contact_id = $1 ORDER BY t.name`,
    [contact.id]
  );
  const availableTags = await pool.query(
    `SELECT id, name FROM tags
     WHERE id NOT IN (SELECT tag_id FROM contact_tags WHERE contact_id = $1)
     ORDER BY name`,
    [contact.id]
  );

  res.render("contacts/show", {
    contact,
    events: events.rows,
    tags: tags.rows,
    availableTags: availableTags.rows,
  });
});

contactsRouter.post("/:id", async (req, res) => {
  const { email, name } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).send("valid email is required");
  }
  await pool.query(`UPDATE contacts SET email = $1, name = $2 WHERE id = $3`, [
    email.trim().toLowerCase(),
    name?.trim() || null,
    req.params.id,
  ]);
  res.redirect(`/contacts/${req.params.id}`);
});

contactsRouter.post("/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ["active", "unsubscribed", "bounced", "complained"];
  if (!allowed.includes(status)) {
    return res.status(400).send("invalid status");
  }
  await pool.query(`UPDATE contacts SET status = $1 WHERE id = $2`, [status, req.params.id]);
  res.redirect(`/contacts/${req.params.id}`);
});

contactsRouter.post("/:id/delete", async (req, res) => {
  await pool.query(`DELETE FROM contacts WHERE id = $1`, [req.params.id]);
  res.redirect("/contacts");
});

contactsRouter.post("/:id/tags", async (req, res) => {
  const { tagId } = req.body ?? {};
  if (tagId) {
    await pool.query(
      `INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, tagId]
    );
  }
  res.redirect(`/contacts/${req.params.id}`);
});

contactsRouter.post("/:id/tags/:tagId/delete", async (req, res) => {
  await pool.query(`DELETE FROM contact_tags WHERE contact_id = $1 AND tag_id = $2`, [
    req.params.id,
    req.params.tagId,
  ]);
  res.redirect(`/contacts/${req.params.id}`);
});
