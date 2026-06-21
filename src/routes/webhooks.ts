import express, { Router } from "express";
import { suppressContact } from "../services/contacts";

export const webhooksRouter = Router();

// SNS posts as text/plain, not JSON — must parse the raw body ourselves.
webhooksRouter.use(express.text({ type: "*/*" }));

interface SesBounceOrComplaint {
  notificationType: "Bounce" | "Complaint";
  bounce?: {
    bounceType: string; // "Permanent" | "Transient" | "Undetermined"
    bouncedRecipients: { emailAddress: string }[];
  };
  complaint?: {
    complainedRecipients: { emailAddress: string }[];
  };
}

webhooksRouter.post("/", async (req, res) => {
  let snsMessage: Record<string, any>;
  try {
    snsMessage = JSON.parse(req.body);
  } catch {
    res.status(400).send("invalid body");
    return;
  }

  const messageType = req.headers["x-amz-sns-message-type"];

  if (messageType === "SubscriptionConfirmation") {
    await fetch(snsMessage.SubscribeURL);
    res.status(200).send("subscribed");
    return;
  }

  if (messageType === "UnsubscribeConfirmation") {
    res.status(200).send("ok");
    return;
  }

  if (messageType === "Notification") {
    const sesEvent: SesBounceOrComplaint = JSON.parse(snsMessage.Message);

    if (sesEvent.notificationType === "Bounce" && sesEvent.bounce) {
      if (sesEvent.bounce.bounceType === "Permanent") {
        for (const recipient of sesEvent.bounce.bouncedRecipients) {
          await suppressContact(recipient.emailAddress, "bounce", sesEvent.bounce);
        }
      }
      // Transient/Undetermined bounces are normal (e.g. mailbox full) — not suppressed.
    }

    if (sesEvent.notificationType === "Complaint" && sesEvent.complaint) {
      for (const recipient of sesEvent.complaint.complainedRecipients) {
        await suppressContact(recipient.emailAddress, "complaint", sesEvent.complaint);
      }
    }

    res.status(200).send("ok");
    return;
  }

  res.status(200).send("ignored");
});
