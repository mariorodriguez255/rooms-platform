import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

// Provisional landing page. Signed-in users are sent to the dashboard by
// the proxy before this renders.
export default async function Home() {
  const t = await getTranslations("home");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">rooms-platform</h1>
      <p className="max-w-md text-muted-foreground">{t("tagline")}</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">{t("signup")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">{t("login")}</Link>
        </Button>
      </div>
    </main>
  );
}
