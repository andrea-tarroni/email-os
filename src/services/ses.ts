import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION });

export interface ContactToSend {
  email: string;
  unsubscribe_token: string;
}

function unsubscribeUrl(token: string) {
  return `${process.env.BASE_URL}/unsubscribe/${token}`;
}

function buildRawMessage(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  unsubscribeToken: string;
}) {
  const unsubUrl = unsubscribeUrl(opts.unsubscribeToken);
  const htmlWithFooter = `${opts.html}<hr><p style="font-size:12px;color:#888;">
    <a href="${unsubUrl}">Unsubscribe</a></p>`;
  const boundary = `----=_EmailOS_${Date.now()}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`;

  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `List-Unsubscribe: <${unsubUrl}>, <mailto:${opts.from}?subject=unsubscribe>`,
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const textPart = opts.text ?? opts.html.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n").replace(/<[^>]+>/g, "");

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    textPart,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlWithFooter,
    `--${boundary}--`,
  ].join("\r\n");

  return `${headers}\r\n\r\n${body}`;
}

export async function sendCampaignEmail(
  contact: ContactToSend,
  subject: string,
  html: string,
  text: string | null
) {
  const raw = buildRawMessage({
    from: process.env.SES_FROM_ADDRESS!,
    to: contact.email,
    subject,
    html,
    text,
    unsubscribeToken: contact.unsubscribe_token,
  });

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(raw) },
    })
  );
}
