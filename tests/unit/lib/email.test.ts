import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import {
  candidateConfirmationEmail,
  newApplicationEmail,
} from "@/lib/applications/emails";
import { escapeHtml } from "@/lib/html";
import { createMailpitSender } from "@/lib/providers/email/mailpit";
import { createResendSender } from "@/lib/providers/email/resend";
import { parseAddress } from "@/lib/providers/email/types";
import messages from "@/messages/es.json";

const t = createTranslator({ locale: "es", messages, namespace: "emails" });

const message = {
  to: "elena@example.org",
  subject: "Asunto",
  html: "<p>Hola</p>",
  text: "Hola",
  replyTo: "privacidad@example.org",
};

function okFetch() {
  return vi.fn<typeof fetch>(async () => new Response("{}", { status: 200 }));
}

describe("escapeHtml", () => {
  it("turns markup into text", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });
});

describe("parseAddress", () => {
  it("reads 'Name <address>' and bare addresses", () => {
    expect(parseAddress("rooms-platform <avisos@example.com>")).toEqual({
      name: "rooms-platform",
      email: "avisos@example.com",
    });
    expect(parseAddress(" avisos@example.com ")).toEqual({
      name: "",
      email: "avisos@example.com",
    });
  });
});

describe("Resend sender", () => {
  it("posts one recipient to the REST API with reply_to", async () => {
    const fetchImpl = okFetch();
    const sender = createResendSender(
      { apiKey: "test-key", from: "rooms-platform <onboarding@resend.dev>" }, // secret-scan:allow (test value)
      fetchImpl,
    );
    await sender.send(message);

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "rooms-platform <onboarding@resend.dev>",
      to: ["elena@example.org"],
      subject: "Asunto",
      html: "<p>Hola</p>",
      text: "Hola",
      reply_to: "privacidad@example.org",
    });
  });

  it("fails loudly without leaking the response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("elena@example.org is invalid", { status: 422 }),
    );
    const sender = createResendSender(
      { apiKey: "k", from: "a@b.c" },
      fetchImpl,
    );
    await expect(sender.send(message)).rejects.toThrow(
      "Resend rejected the email (HTTP 422)",
    );
  });
});

describe("Mailpit sender", () => {
  it("uses Mailpit's send API", async () => {
    const fetchImpl = okFetch();
    const sender = createMailpitSender(
      {
        url: "http://127.0.0.1:54324",
        from: "rooms-platform <avisos@example.com>",
      },
      fetchImpl,
    );
    await sender.send(message);

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("http://127.0.0.1:54324/api/v1/send");
    expect(JSON.parse(String(init?.body))).toEqual({
      From: { Email: "avisos@example.com", Name: "rooms-platform" },
      To: [{ Email: "elena@example.org" }],
      ReplyTo: [{ Email: "privacidad@example.org" }],
      Subject: "Asunto",
      HTML: "<p>Hola</p>",
      Text: "Hola",
    });
  });
});

describe("application emails", () => {
  const hostile = `Eve <img src=x onerror=alert(1)>\nBcc: x@evil.example`;

  it("confirms to the candidate, with replies going to the operator", () => {
    const email = candidateConfirmationEmail(t, {
      to: "elena@example.org",
      candidateName: "Elena",
      roomName: "Habitación 1",
      city: "Madrid",
      organization: "Pisos Ejemplo",
      contactEmail: "privacidad@example.org",
    });
    expect(email.subject).toBe(
      "Hemos recibido tu candidatura: Habitación 1, Madrid",
    );
    expect(email.replyTo).toBe("privacidad@example.org");
    expect(email.text).toContain("Hola, Elena:");
    expect(email.text).toContain("privacidad@example.org");
  });

  it("tells members, with a link and no personal data beyond the name", () => {
    const email = newApplicationEmail(t, {
      to: "ana@example.com",
      candidateName: "Elena",
      roomName: "Habitación 1",
      propertyName: "Piso Calle Ficticia",
      organization: "Pisos Ejemplo",
      link: "https://example.com/applications/123",
    });
    expect(email.subject).toBe("Nueva candidatura de Elena para Habitación 1");
    expect(email.html).toContain(
      '<a href="https://example.com/applications/123">Ver la candidatura</a>',
    );
    expect(email.text).toContain(
      "Ver la candidatura: https://example.com/applications/123",
    );
  });

  it("never turns what the candidate typed into markup or extra headers", () => {
    const email = newApplicationEmail(t, {
      to: "ana@example.com",
      candidateName: hostile,
      roomName: "Habitación 1",
      propertyName: "Piso",
      organization: "Pisos Ejemplo",
      link: "https://example.com/applications/123",
    });
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
    expect(email.subject).not.toContain("\n");
  });
});
