import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import messages from "@/messages/es.json";

// Renders a Client Component with the real Spanish messages.
export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider
      locale="es"
      messages={messages}
      timeZone="Europe/Madrid"
    >
      {ui}
    </NextIntlClientProvider>,
  );
}
