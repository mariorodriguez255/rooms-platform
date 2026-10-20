import { getTranslations } from "next-intl/server";
import Link from "next/link";

import {
  findActiveMembership,
  getMemberships,
  requireUser,
} from "@/lib/auth/session";

import { UserMenu } from "./user-menu";

export async function AppHeader() {
  const [user, memberships, active, t] = await Promise.all([
    requireUser(),
    getMemberships(),
    findActiveMembership(),
    getTranslations("nav"),
  ]);

  return (
    <>
      {active ? (
        <nav
          aria-label={active.orgName}
          className="order-3 flex w-full items-center gap-4 text-sm sm:order-2 sm:w-auto"
        >
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            {t("dashboard")}
          </Link>
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
      ) : null}
      <div className="order-2 ml-auto sm:order-3">
        <UserMenu
          email={user.email}
          memberships={memberships}
          activeOrgId={active?.orgId ?? null}
        />
      </div>
    </>
  );
}
