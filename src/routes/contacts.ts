import { Router } from "express";
import { pool } from "../db";
import { upsertActiveContact } from "../services/contacts";

export const contactsRouter = Router();

contactsRouter.get("/", async (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
  const { rows } = await pool.query(
    statusFilter
      ? `SELECT id, email, name, source, status, created_at FROM contacts WHERE status = $1 ORDER BY created_at DESC`
      : `SELECT id, email, name, source, status, created_at FROM contacts ORDER BY created_at DESC`,
    statusFilter ? [statusFilter] : []
  );
  const counts = await pool.query(
    `SELECT status, count(*) FROM contacts GROUP BY status`
  );
  res.render("contacts/list", { contacts: rows, counts: counts.rows, statusFilter });
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

contactsRouter.post("/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ["active", "unsubscribed", "bounced", "complained"];
  if (!allowed.includes(status)) {
    return res.status(400).send("invalid status");
  }
  await pool.query(`UPDATE contacts SET status = $1 WHERE id = $2`, [status, req.params.id]);
  res.redirect("/contacts");
});

contactsRouter.post("/:id/delete", async (req, res) => {
  await pool.query(`DELETE FROM contacts WHERE id = $1`, [req.params.id]);
  res.redirect("/contacts");
});
