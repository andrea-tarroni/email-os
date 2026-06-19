import { Router } from "express";
import { pool } from "../db";

export const campaignsApiRouter = Router();

/**
 * POST /api/campaigns/draft
 * Integration point for Andrea's HTML-generation workflow (previously pointed at
 * GetResponse's draft API). Body: { subject, html, text? }.
 * Requires header: x-api-key: DRAFT_API_KEY
 */
campaignsApiRouter.post("/draft", async (req, res) => {
  if (req.header("x-api-key") !== process.env.DRAFT_API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { subject, html, text } = req.body ?? {};
  if (!subject || !html) {
    return res.status(400).json({ error: "subject and html are required" });
  }

  const { rows } = await pool.query(
    `INSERT INTO campaigns (subject, html, text, status) VALUES ($1, $2, $3, 'draft') RETURNING id`,
    [subject, html, text ?? null]
  );

  res.status(201).json({ id: rows[0].id, status: "draft" });
});
