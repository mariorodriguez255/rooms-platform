"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { createOrganization, type OrganizationField } from "../actions";

export function CreateOrganizationForm() {
  const t = useTranslations("onboarding");
  const [state, action] = useActionState(
    createOrganization,
    initialFormState as FormState<OrganizationField>,
  );

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormError error={state.error} />
        <TextField
          name="name"
          label={t("name")}
          placeholder={t("namePlaceholder")}
          autoComplete="organization"
          required
          maxLength={100}
          defaultValue={state.values?.name ?? ""}
          error={state.fieldErrors?.name}
        />
        <SubmitButton className="w-full">{t("submit")}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
