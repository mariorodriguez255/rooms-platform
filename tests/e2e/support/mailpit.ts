import { expect } from "@playwright/test";

// Local Supabase sends every email to Mailpit (http://127.0.0.1:54324)
// instead of delivering it. These helpers read the link out of the email,
// as a person would click it.

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSearch = { messages: { ID: string; Subject: string }[] };
export type MailpitMessage = {
  Subject: string;
  HTML: string;
  Text: string;
  ReplyTo: { Address: string }[] | null;
};

// Waits for an email to `to` whose subject contains `subject` and returns it.
export async function findEmail(
  to: string,
  subject: string,
): Promise<MailpitMessage> {
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
  return (await response.json()) as MailpitMessage;
}

export async function emailLink(to: string, subject: string): Promise<string> {
  const message = await findEmail(to, subject);
  // Default templates link to Supabase (/auth/v1/verify), which redirects
  // to /auth/confirm with ?code=; our own templates link to /auth/confirm
  // with ?token_hash= (see src/app/auth/confirm/route.ts).
  const href = /href="([^"]*(?:\/auth\/v1\/verify|token_hash=)[^"]*)"/.exec(
    message.HTML,
  )?.[1];
  if (!href) throw new Error(`No auth link in the email to ${to}`);
  // The template is HTML: & arrives as &amp;.
  return href.replaceAll("&amp;", "&");
}
