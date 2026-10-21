import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardDescription, CardHeader } from "@/components/ui/card";

// Shown in place of a page whose record does not exist, was deleted or
// belongs to another organization (we do not tell which).
export function NotFoundNotice({
  message,
  backHref,
  backLabel,
}: {
  message: ReactNode;
  backHref: string;
  backLabel: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardDescription>{message}</CardDescription>
        <Link href={backHref} className="text-sm underline underline-offset-4">
          {backLabel}
        </Link>
      </CardHeader>
    </Card>
  );
}
