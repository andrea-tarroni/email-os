import { Router } from "express";
import { pool } from "../db";

export const tagsRouter = Router();

tagsRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT t.id, t.name, count(ct.contact_id) AS contact_count
     FROM tags t
     LEFT JOIN contact_tags ct ON ct.tag_id = t.id
     GROUP BY t.id, t.name
     ORDER BY t.name`
  );
  res.render("tags/list", { tags: rows });
});

tagsRouter.post("/", async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).send("tag name is required");
  }
  await pool.query(`INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name.trim()]);
  res.redirect("/tags");
});

tagsRouter.post("/:id/delete", async (req, res) => {
  await pool.query(`DELETE FROM tags WHERE id = $1`, [req.params.id]);
  res.redirect("/tags");
});
