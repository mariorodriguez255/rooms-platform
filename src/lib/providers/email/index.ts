import "server-only";

import { getEmailEnv } from "@/lib/server-env";

import { createMailpitSender } from "./mailpit";
import { createResendSender } from "./resend";
import type { EmailSender } from "./types";

export type { EmailMessage, EmailSender } from "./types";

// The sender chosen by EMAIL_PROVIDER (see .env.example):
//   resend    production and Vercel previews
//   mailpit   local development and CI
//   disabled  nothing is sent (logged without any content)
export function getEmailSender(): EmailSender {
  const env = getEmailEnv();
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return createResendSender({
        apiKey: env.RESEND_API_KEY,
        from: env.EMAIL_FROM,
      });
    case "mailpit":
      return createMailpitSender({
        url: env.MAILPIT_URL,
        from: env.EMAIL_FROM,
      });
    case "disabled":
      return {
        async send() {
          console.info("Email not sent: EMAIL_PROVIDER=disabled");
        },
      };
  }
}
