import type { Locale } from "@/i18n/config";
import type messages from "@/messages/es.json";

// Type-checked translation keys: t("auth.login.title") fails to compile if
// the key does not exist in the Spanish messages.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
