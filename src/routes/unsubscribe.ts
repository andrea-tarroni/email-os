import { Router } from "express";
import { unsubscribeByToken } from "../services/contacts";

export const unsubscribeRouter = Router();

/**
 * GET /unsubscribe/:token
 * Target of both the List-Unsubscribe header (one-click) and the footer link
 * in every sent email.
 */
unsubscribeRouter.get("/:token", async (req, res) => {
  const contact = await unsubscribeByToken(req.params.token);
  res.render("unsubscribe/confirm", { found: Boolean(contact) });
});

// Gmail/Yahoo one-click unsubscribe (RFC 8058) sends a POST here with the same token.
unsubscribeRouter.post("/:token", async (req, res) => {
  await unsubscribeByToken(req.params.token);
  res.status(200).send("unsubscribed");
});
