"use client";

import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ErrorKey } from "@/lib/errors";

// Error of a form as a whole (not tied to one field).
export function FormError({ error }: { error: ErrorKey | undefined }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden />
      <AlertDescription>{t(error)}</AlertDescription>
    </Alert>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <Alert role="status">
      <CircleCheckIcon aria-hidden />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
