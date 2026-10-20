"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { ActionError } from "@/components/actions/action-error";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { MemberRole } from "@/lib/auth/permissions";
import type { ErrorKey } from "@/lib/errors";

import { changeMemberRole } from "../actions";

type RoleSelectProps = {
  memberId: string;
  role: MemberRole;
  options: MemberRole[];
  label: string;
};

// Native <select>: works on phones with the system picker and needs no
// extra JavaScript to show its value.
export function RoleSelect({
  memberId,
  role,
  options,
  label,
}: RoleSelectProps) {
  const t = useTranslations("roles");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    setError(null);
    startTransition(async () => {
      const result = await changeMemberRole(memberId, next);
      if (result.status === "error") setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {/* key: if the change is refused, remount to show the stored role again. */}
      <NativeSelect
        key={error ?? "ok"}
        size="sm"
        aria-label={label}
        defaultValue={role}
        disabled={pending}
        onChange={(event) => change(event.target.value)}
        className="w-40"
      >
        {options.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {t(option)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ActionError error={error} />
    </div>
  );
}
