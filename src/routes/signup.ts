import { Router } from "express";
import { upsertActiveContact } from "../services/contacts";

export const signupRouter = Router();

/**
 * POST /signup
 * Public endpoint for the landing page opt-in form (replaces GetResponse's
 * <getresponse-form> embed). Body: { email, name? }.
 */
signupRouter.post("/", async (req, res) => {
  const { email, name } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "valid email is required" });
  }

  await upsertActiveContact(email.trim().toLowerCase(), name?.trim() || null, {
    source: "andreatarroni_signup_form",
    ip: req.ip,
  });

  res.status(201).json({ ok: true });
});
