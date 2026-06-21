import "dotenv/config";
import express from "express";
import path from "node:path";
import { campaignsRouter } from "./routes/campaigns";
import { campaignsApiRouter } from "./routes/campaignsApi";
import { contactsRouter } from "./routes/contacts";
import { signupRouter } from "./routes/signup";
import { unsubscribeRouter } from "./routes/unsubscribe";
import { webhooksRouter } from "./routes/webhooks";

const app = express();

// Trust the Nginx reverse proxy's X-Forwarded-For so req.ip reflects the
// real client IP instead of localhost.
app.set("trust proxy", "loopback");

// Mounted before the global JSON body parser since SNS posts text/plain
// and the route parses its own raw body.
app.use(process.env.SNS_WEBHOOK_PATH ?? "/webhooks/ses-notifications", webhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/api/campaigns", campaignsApiRouter);
app.use("/campaigns", campaignsRouter);
app.use("/contacts", contactsRouter);
app.use("/signup", signupRouter);
app.use("/unsubscribe", unsubscribeRouter);

app.get("/", (_req, res) => {
  res.redirect("/contacts");
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Email OS listening on port ${port}`);
});
