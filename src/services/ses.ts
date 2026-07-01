import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ContactToSend {
  email: string;
  unsubscribe_token: string;
}

function unsubscribeUrl(token: string) {
  return `${process.env.BASE_URL}/unsubscribe/${token}`;
}

function confirmationUrl(token: string) {
  return `${process.env.BASE_URL}/confirm/${token}`;
}

const FROM = () => process.env.MAIL_FROM_ADDRESS!;

export async function sendCampaignEmail(
  contact: ContactToSend,
  subject: string,
  html: string,
  text: string | null
) {
  const unsubUrl = unsubscribeUrl(contact.unsubscribe_token);
  const privacyUrl = "https://andreatarroni.com/privacy";

  const htmlWithFooter = `${html}<hr><p style="font-size:12px;color:#888;">
    <a href="${unsubUrl}">Unsubscribe</a> &middot; <a href="${privacyUrl}">Privacy Policy</a></p>`;

  const plainText = text ?? html.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n").replace(/<[^>]+>/g, "");

  const { error } = await resend.emails.send({
    from: FROM(),
    to: contact.email,
    subject,
    html: htmlWithFooter,
    text: plainText,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:${FROM()}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.name} - ${error.message}`);
  }
}

export async function sendConfirmationEmail(
  to: string,
  confirmationToken: string
) {
  const url = confirmationUrl(confirmationToken);

  const { error } = await resend.emails.send({
    from: FROM(),
    to,
    subject: "Please confirm your subscription to Andrea Tarroni's newsletter",
    html: `<p>Thanks for signing up! Click the link below to confirm your subscription:</p>
<p><a href="${url}">${url}</a></p>
<p style="font-size:12px;color:#888;">If you didn't sign up for this newsletter, you can ignore this email.</p>`,
    text: `Thanks for signing up! Confirm your subscription by visiting this link:\n\n${url}\n\nIf you didn't sign up for this newsletter, you can ignore this email.`,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.name} - ${error.message}`);
  }
}
