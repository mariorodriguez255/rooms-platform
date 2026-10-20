"use client";

import { useTranslations } from "next-intl";
import { useId, type ComponentProps, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ValidationKey } from "@/lib/validation/form";

type TextFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ValidationKey | undefined;
};

// Label + input + help text + translated validation error, wired up with
// the ids that screen readers need.
export function TextField({
  label,
  description,
  error,
  id,
  ...inputProps
}: TextFieldProps) {
  const t = useTranslations("validation");
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{t(error)}</FieldError> : null}
    </Field>
  );
}
