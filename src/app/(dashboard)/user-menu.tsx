"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Membership } from "@/lib/auth/session";

import { signOut, switchOrganization } from "./actions";

type UserMenuProps = {
  email: string;
  memberships: Membership[];
  activeOrgId: string | null;
};

export function UserMenu({ email, memberships, activeOrgId }: UserMenuProps) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const active = memberships.find((m) => m.orgId === activeOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="max-w-56"
        >
          <span className="truncate">
            {active?.orgName ?? t("nav.account")}
          </span>
          <ChevronDownIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        {memberships.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t("nav.switchOrganization")}
              </DropdownMenuLabel>
              {memberships.map((membership) => (
                <DropdownMenuItem
                  key={membership.orgId}
                  onSelect={() =>
                    startTransition(() => switchOrganization(membership.orgId))
                  }
                >
                  <span className="truncate">{membership.orgName}</span>
                  {membership.orgId === activeOrgId ? (
                    <CheckIcon className="ml-auto" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">{t("nav.newOrganization")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTransition(() => signOut())}>
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
