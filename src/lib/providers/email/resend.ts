import type { EmailMessage, EmailSender } from "./types";

// Resend's REST API (https://resend.com/docs/api-reference/emails/send-email),
// called with fetch: one endpoint does not justify another dependency.
const ENDPOINT = "https://api.resend.com/emails";

export function createResendSender(
  { apiKey, from }: { apiKey: string; from: string },
  fetchImpl: typeof fetch = fetch,
): EmailSender {
  return {
    async send(message: EmailMessage) {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      if (!response.ok) {
        // Status only: the response could echo the recipient.
        throw new Error(`Resend rejected the email (HTTP ${response.status})`);
      }
    },
  };
}
