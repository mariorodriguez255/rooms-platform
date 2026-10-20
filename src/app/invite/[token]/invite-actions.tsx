"use client";

import { useState, useTransition } from "react";

import { ActionError } from "@/components/actions/action-error";
import { Button } from "@/components/ui/button";
import type { ErrorKey } from "@/lib/errors";

import { signOut } from "../../(dashboard)/actions";
import { acceptInvitation } from "./actions";

export function AcceptInvitation({
  token,
  label,
}: {
  token: string;
  label: string;
}) {
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <ActionError error={error} />
      <Button
        className="self-start"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInvitation(token);
            if (result.status === "error") setError(result.error);
          })
        }
      >
        {label}
      </Button>
    </div>
  );
}

// Signs out and comes back to the invitation after signing in with the
// right account.
export function SwitchAccount({
  next,
  label,
}: {
  next: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="self-start"
      disabled={pending}
      onClick={() => startTransition(() => signOut(next))}
    >
      {label}
    </Button>
  );
}
