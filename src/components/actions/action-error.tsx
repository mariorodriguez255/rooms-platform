"use client";

import { useTranslations } from "next-intl";

import type { ErrorKey } from "@/lib/errors";

// Inline error of a one-click action (change a role, revoke…).
export function ActionError({ error }: { error: ErrorKey | null }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {t(error)}
    </p>
  );
}
