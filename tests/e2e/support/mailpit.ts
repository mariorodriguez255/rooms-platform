import { expect } from "@playwright/test";

// Local Supabase sends every email to Mailpit (http://127.0.0.1:54324)
// instead of delivering it. These helpers read the link out of the email,
// as a person would click it.

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSearch = { messages: { ID: string; Subject: string }[] };
type MailpitMessage = { HTML: string };

export async function emailLink(to: string, subject: string): Promise<string> {
  let messageId: string | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}" subject:"${subject}"`);
        const response = await fetch(
          `${MAILPIT_URL}/api/v1/search?query=${query}`,
        );
        const result = (await response.json()) as MailpitSearch;
        messageId = result.messages[0]?.ID;
        return messageId;
      },
      { message: `email "${subject}" to ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();

  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const message = (await response.json()) as MailpitMessage;
  const href = /href="([^"]*token_hash=[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error(`No auth link in the email to ${to}`);
  // The template is HTML: & arrives as &amp;.
  return href.replaceAll("&amp;", "&");
}
