"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError, FormSuccess } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { renameOrganization, type OrganizationSettingsField } from "../actions";

export function OrganizationForm({
  name,
  editable,
}: {
  name: string;
  editable: boolean;
}) {
  const t = useTranslations();
  const [state, action] = useActionState(
    renameOrganization,
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
        {editable ? (
          <SubmitButton className="self-start">{t("common.save")}</SubmitButton>
        ) : null}
      </FieldGroup>
    </form>
  );
}
