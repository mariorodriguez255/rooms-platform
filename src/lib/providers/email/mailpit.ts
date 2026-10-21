import { parseAddress, type EmailMessage, type EmailSender } from "./types";

// Mailpit, the email catcher of the local Supabase: emails sent in
// development and CI land there instead of real inboxes, and the
// end-to-end tests read them (tests/e2e/support/mailpit.ts).
export function createMailpitSender(
  { url, from }: { url: string; from: string },
  fetchImpl: typeof fetch = fetch,
): EmailSender {
  const sender = parseAddress(from);
  return {
    async send(message: EmailMessage) {
      const response = await fetchImpl(new URL("/api/v1/send", url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: sender.email, Name: sender.name },
          To: [{ Email: message.to }],
          ...(message.replyTo ? { ReplyTo: [{ Email: message.replyTo }] } : {}),
          Subject: message.subject,
          HTML: message.html,
          Text: message.text,
        }),
      });
      if (!response.ok) {
        throw new Error(`Mailpit rejected the email (HTTP ${response.status})`);
      }
    },
  };
}
