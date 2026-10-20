// The UI is only in Spanish for now, but every text goes through next-intl
// so that adding English means adding src/messages/en.json and choosing the
// locale here (from a user setting or a cookie). See ADR 0006.
export const locales = ["es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";
