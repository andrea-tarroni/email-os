import { Router } from "express";
import { insertPendingContact } from "../services/contacts";
import { sendConfirmationEmail } from "../services/ses";

export const signupRouter = Router();

const LANDING_PAGE_ORIGIN = "https://andreatarroni.com";

signupRouter.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", LANDING_PAGE_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

/**
 * POST /signup
 * Public endpoint for the landing page opt-in form (replaces GetResponse's
 * <getresponse-form> embed). Body: { email, name? }.
 * Inserts a pending contact and sends a confirmation email (double opt-in).
 */
signupRouter.post("/", async (req, res) => {
  const { email, name } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "valid email is required" });
  }

  const contact = await insertPendingContact(
    email.trim().toLowerCase(),
    name?.trim() || null,
    { source: "andreatarroni_signup_form", ip: req.ip }
  );

  if (contact) {
    await sendConfirmationEmail(email.trim().toLowerCase(), contact.confirmation_token);
  }

  res.status(201).json({ ok: true });
});
