"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ErrorKey } from "@/lib/errors";

import { ActionError } from "./action-error";
import type { ActionResult } from "./types";

type ConfirmActionDialogProps = {
  triggerLabel: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  // A Server Action bound to its arguments, e.g. removeMember.bind(null, id).
  action: () => Promise<ActionResult | void>;
};

// Asks for confirmation before an action that cannot be undone from here.
export function ConfirmActionDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  action,
}: ConfirmActionDialogProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await action();
      if (result?.status === "error") {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ActionError error={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={pending}
            aria-busy={pending}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
