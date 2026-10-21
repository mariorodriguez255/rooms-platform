"use client";

import { useTranslations } from "next-intl";
import { useId, type ComponentProps, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { ValidationKey } from "@/lib/validation/form";

type SelectFieldProps = Omit<
  ComponentProps<typeof NativeSelect>,
  "children"
> & {
  name: string;
  label: ReactNode;
  options: readonly { value: string; label: string }[];
  // First, empty option ("Choose one"); submitting it fails validation.
  placeholder?: string;
  description?: ReactNode;
  error?: ValidationKey | undefined;
};

// Native <select> (see progress.md: Radix's Select did not show its value
// with Cache Components) with label, help text and translated error.
export function SelectField({
  label,
  options,
  placeholder,
  description,
  error,
  id,
  className,
  ...selectProps
}: SelectFieldProps) {
  const t = useTranslations("validation");
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;
  const errorId = `${selectId}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
      <NativeSelect
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={className}
        {...selectProps}
      >
        {placeholder !== undefined ? (
          <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        ) : null}
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{t(error)}</FieldError> : null}
    </Field>
  );
}
