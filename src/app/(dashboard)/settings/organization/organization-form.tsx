"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError, FormSuccess } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { updateOrganization, type OrganizationSettingsField } from "../actions";

export function OrganizationForm({
  name,
  contactEmail,
  editable,
}: {
  name: string;
  contactEmail: string;
  editable: boolean;
}) {
  const t = useTranslations();
  const [state, action] = useActionState(
    updateOrganization,
    initialFormState as FormState<OrganizationSettingsField>,
  );

  return (
    <form action={action} noValidate className="max-w-md">
      <FieldGroup>
        <FormError error={state.error} />
        {state.status === "success" ? (
          <FormSuccess>{t("common.saved")}</FormSuccess>
        ) : null}
        <TextField
          name="name"
          label={t("settings.organization.name")}
          required
          maxLength={100}
          readOnly={!editable}
          defaultValue={state.values?.name ?? name}
          error={state.fieldErrors?.name}
        />
        <TextField
          name="contactEmail"
          type="email"
          label={t("settings.organization.contactEmail")}
          description={t("settings.organization.contactEmailHelp")}
          maxLength={254}
          readOnly={!editable}
          defaultValue={state.values?.contactEmail ?? contactEmail}
          error={state.fieldErrors?.contactEmail}
        />
        {editable ? (
          <SubmitButton className="self-start">{t("common.save")}</SubmitButton>
        ) : null}
      </FieldGroup>
    </form>
  );
}
