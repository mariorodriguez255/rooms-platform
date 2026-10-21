// Outgoing email behind our own interface (CLAUDE.md: external providers
// behind interfaces), so that the provider can change without touching the
// code that sends. See ADR 0011.

export type EmailMessage = {
  // One recipient per message: nobody sees who else got it.
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

// "Name <address>" or a bare address.
export function parseAddress(value: string): { name: string; email: string } {
  const match = /^\s*(.*?)\s*<([^<>\s]+)>\s*$/.exec(value);
  if (match) return { name: match[1] ?? "", email: match[2] ?? "" };
  return { name: "", email: value.trim() };
}
