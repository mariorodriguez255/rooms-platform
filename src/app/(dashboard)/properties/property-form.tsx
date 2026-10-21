"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { FormError } from "@/components/forms/form-alert";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SPANISH_REGIONS } from "@/lib/regions";
import { initialFormState, type FormState } from "@/lib/validation/form";

import type { PropertyField } from "./actions";

type PropertyFormProps = {
  // createProperty, or updateProperty bound to the property id.
  action: (
    previous: FormState<PropertyField>,
    formData: FormData,
  ) => Promise<FormState<PropertyField>>;
  defaults?: Partial<Record<PropertyField, string>>;
  submitLabel: string;
  cancelHref: string;
};

export function PropertyForm({
  action,
  defaults = {},
  submitLabel,
  cancelHref,
}: PropertyFormProps) {
  const t = useTranslations();
  const [state, formAction] = useActionState(
    action,
    initialFormState as FormState<PropertyField>,
  );
  const value = (field: PropertyField) =>
    state.values?.[field] ?? defaults[field] ?? "";

  return (
    <form action={formAction} noValidate className="max-w-xl">
      <FieldGroup>
        <FormError error={state.error} />
        <TextField
          name="name"
          label={t("properties.name")}
          description={t("properties.nameHelp")}
          required
          maxLength={100}
          defaultValue={value("name")}
          error={state.fieldErrors?.name}
        />
        <TextField
          name="address"
          label={t("properties.address")}
          description={t("properties.addressHelp")}
          required
          maxLength={200}
          autoComplete="street-address"
          defaultValue={value("address")}
          error={state.fieldErrors?.address}
        />
        <TextField
          name="city"
          label={t("properties.city")}
          required
          maxLength={100}
          autoComplete="address-level2"
          defaultValue={value("city")}
          error={state.fieldErrors?.city}
        />
        <SelectField
          // key: a native select only reads defaultValue when it mounts.
          key={value("region")}
          name="region"
          label={t("properties.region")}
          placeholder={t("properties.regionPlaceholder")}
          options={SPANISH_REGIONS.map((code) => ({
            value: code,
            label: t(`regions.${code}`),
          }))}
          required
          defaultValue={value("region")}
          error={state.fieldErrors?.region}
        />
        <TextField
          name="totalRentReference"
          label={t("properties.totalRentReference")}
          description={t("properties.totalRentReferenceHelp")}
          inputMode="decimal"
          defaultValue={value("totalRentReference")}
          error={state.fieldErrors?.totalRentReference}
          className="max-w-40"
        />
        <div className="flex flex-wrap gap-3">
          <SubmitButton>{submitLabel}</SubmitButton>
          <Button variant="outline" asChild>
            <Link href={cancelHref}>{t("common.cancel")}</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
