import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("nav");
  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-10">
      <nav className="flex gap-4 text-sm md:w-40 md:flex-col md:gap-2">
        <Link
          href="/settings/organization"
          className="text-muted-foreground hover:text-foreground"
        >
          {t("organization")}
        </Link>
        <Link
          href="/settings/members"
          className="text-muted-foreground hover:text-foreground"
        >
          {t("members")}
        </Link>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
