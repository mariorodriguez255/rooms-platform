import "server-only";

import { z } from "zod";

// Server-only variables, validated when first used (not at import time):
// a page that does not send emails must not fail because the email
// variables are missing. Names only in errors, never values.

function parse<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ].join(", ");
    throw new Error(
      `Missing or invalid environment variables: ${names}. See .env.example.`,
    );
  }
  return result.data;
}

export function getSecretKey(): string {
  return parse(z.object({ SUPABASE_SECRET_KEY: z.string().min(1) }), {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  }).SUPABASE_SECRET_KEY;
}

export function getIpHashSecret(): string {
  return parse(z.object({ IP_HASH_SECRET: z.string().min(32) }), {
    IP_HASH_SECRET: process.env.IP_HASH_SECRET,
  }).IP_HASH_SECRET;
}

const emailEnvSchema = z.discriminatedUnion("EMAIL_PROVIDER", [
  z.object({
    EMAIL_PROVIDER: z.literal("resend"),
    EMAIL_FROM: z.string().min(3),
    RESEND_API_KEY: z.string().min(1),
  }),
  z.object({
    EMAIL_PROVIDER: z.literal("mailpit"),
    EMAIL_FROM: z.string().min(3),
    MAILPIT_URL: z.url(),
  }),
  z.object({ EMAIL_PROVIDER: z.literal("disabled") }),
]);

export type EmailEnv = z.infer<typeof emailEnvSchema>;

export function parseEmailEnv(
  source: Record<string, string | undefined>,
): EmailEnv {
  return parse(emailEnvSchema, source);
}

export function getEmailEnv(): EmailEnv {
  return parseEmailEnv({
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAILPIT_URL: process.env.MAILPIT_URL,
  });
}
