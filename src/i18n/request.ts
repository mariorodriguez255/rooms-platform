import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "./config";

// Fixed locale, no locale in the URL. Not reading headers or cookies here
// keeps public pages static under Cache Components.
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone: "Europe/Madrid",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
