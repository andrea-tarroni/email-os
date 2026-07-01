import { Router } from "express";
import { confirmContact } from "../services/contacts";

export const confirmRouter = Router();

confirmRouter.get("/:token", async (req, res) => {
  const contact = await confirmContact(req.params.token);
  res.render("confirm/result", { confirmed: Boolean(contact) });
});
