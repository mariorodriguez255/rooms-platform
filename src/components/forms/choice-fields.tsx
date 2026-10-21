"use client";

import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ValidationKey } from "@/lib/validation/form";

// Native radios, checkboxes and textarea: they work without JavaScript,
// open the phone's own controls and need no extra dependency (like the
// native <select>, see progress.md).

// Callers pass `key` with the current value: native inputs only read their
// default when they mount, and the form is refilled after an error.

export function RadioGroupField({
  name,
  legend,
  options,
  defaultValue,
  error,
  description,
  inline = false,
  hint,
}: {
  name: string;
  legend: ReactNode;
  options: readonly { value: string; label: ReactNode }[];
  defaultValue?: string | undefined;
  error?: ValidationKey | undefined;
  description?: ReactNode;
  // Options side by side (a 1–5 scale) instead of one per line.
  inline?: boolean;
  // Labels of both ends of an inline scale.
  hint?: { start: ReactNode; end: ReactNode };
}) {
  const t = useTranslations("validation");
  const id = useId();
  return (
    <FieldSet data-invalid={error ? true : undefined} className="gap-3">
      <FieldLegend variant="label" className="mb-0">
        {legend}
      </FieldLegend>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <div
        className={cn(
          inline ? "grid grid-cols-5 gap-2" : "flex flex-col gap-3",
        )}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          return (
            <Field
              key={option.value}
              orientation={inline ? "vertical" : "horizontal"}
              className={cn(inline && "items-center gap-1")}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={defaultValue === option.value}
                // Radios do not support aria-invalid: point to the error.
                aria-describedby={error ? `${id}-error` : undefined}
                className="size-5 accent-primary"
              />
              <FieldLabel htmlFor={optionId} className="font-normal">
                {option.label}
              </FieldLabel>
            </Field>
          );
        })}
      </div>
      {hint ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{hint.start}</span>
          <span>{hint.end}</span>
        </div>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{t(error)}</FieldError> : null}
    </FieldSet>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  error,
  required,
}: {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  error?: ValidationKey | undefined;
  required?: boolean;
}) {
  const t = useTranslations("validation");
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined} className="gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <FieldLabel htmlFor={id} className="leading-snug font-normal">
          {label}
        </FieldLabel>
      </div>
      {error ? <FieldError id={`${id}-error`}>{t(error)}</FieldError> : null}
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  description,
  defaultValue,
  maxLength,
  error,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  defaultValue?: string;
  maxLength?: number;
  error?: ValidationKey | undefined;
}) {
  const t = useTranslations("validation");
  const id = useId();
  const describedBy =
    [description ? `${id}-description` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        name={name}
        rows={4}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
      />
      {description ? (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{t(error)}</FieldError> : null}
    </Field>
  );
}
