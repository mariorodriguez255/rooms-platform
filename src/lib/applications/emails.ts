import type { useTranslations } from "next-intl";

import { escapeHtml } from "@/lib/html";
import type { EmailMessage } from "@/lib/providers/email/types";

// The two emails of a new application, as plain text and as minimal HTML
// built from the same lines (every line escaped: the candidate's name is
// user input). They carry as little personal data as possible: no answers,
// no contact details. See ADR 0011.

type EmailTranslator = ReturnType<typeof useTranslations<"emails">>;

function render(lines: string[], link?: { href: string; label: string }) {
  const paragraphs = lines.map((line) => `<p>${escapeHtml(line)}</p>`);
  if (link) {
    paragraphs.splice(
      lines.length - 1,
      0,
      `<p><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></p>`,
    );
  }
  const textLines = link
    ? [...lines.slice(0, -1), `${link.label}: ${link.href}`, ...lines.slice(-1)]
    : lines;
  return {
    html: `<!doctype html><html lang="es"><body style="font-family: system-ui, sans-serif; line-height: 1.5">${paragraphs.join("")}</body></html>`,
    text: textLines.join("\n\n"),
  };
}

// Subjects are single lines whatever the candidate typed.
function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function candidateConfirmationEmail(
  t: EmailTranslator,
  data: {
    to: string;
    candidateName: string;
    roomName: string;
    city: string;
    organization: string;
    contactEmail: string;
  },
): EmailMessage {
  const { html, text } = render([
    t("candidate.greeting", { name: data.candidateName }),
    t("candidate.body", {
      organization: data.organization,
      room: data.roomName,
      city: data.city,
    }),
    t("candidate.update"),
    t("candidate.privacy", { email: data.contactEmail }),
    t("candidate.signature", { organization: data.organization }),
  ]);
  return {
    to: data.to,
    subject: oneLine(
      t("candidate.subject", { room: data.roomName, city: data.city }),
    ),
    html,
    text,
    // Replies go to the operator, who is responsible for the data.
    replyTo: data.contactEmail,
  };
}

export function newApplicationEmail(
  t: EmailTranslator,
  data: {
    to: string;
    candidateName: string;
    roomName: string;
    propertyName: string;
    organization: string;
    link: string;
  },
): EmailMessage {
  const { html, text } = render(
    [
      t("newApplication.body", {
        name: data.candidateName,
        room: data.roomName,
        property: data.propertyName,
      }),
      t("newApplication.footer", { organization: data.organization }),
    ],
    { href: data.link, label: t("newApplication.cta") },
  );
  return {
    to: data.to,
    subject: oneLine(
      t("newApplication.subject", {
        name: data.candidateName,
        room: data.roomName,
      }),
    ),
    html,
    text,
  };
}
