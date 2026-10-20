"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { CopyButton } from "@/components/actions/copy-button";
import { FormError, FormSuccess } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { INVITABLE_ROLES } from "@/lib/auth/permissions";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { inviteMember, type InvitationField } from "../actions";

export function InviteForm() {
  const t = useTranslations();
  const [state, action] = useActionState(
    inviteMember,
    initialFormState as FormState<InvitationField>,
  );
  const link = state.status === "success" ? state.values?.link : undefined;

  return (
    <div className="flex flex-col gap-6">
      <form action={action} noValidate className="max-w-md">
        <FieldGroup>
          <FormError error={state.error} />
          <TextField
            name="email"
            type="email"
            label={t("settings.invitations.email")}
            autoComplete="off"
            required
            // A new invitation starts from an empty form.
            key={link ?? "form"}
            defaultValue={
              state.status === "error" ? (state.values?.email ?? "") : ""
            }
            error={state.fieldErrors?.email}
          />
          <Field data-invalid={state.fieldErrors?.role ? true : undefined}>
            <FieldLabel htmlFor="invite-role">
              {t("settings.invitations.role")}
            </FieldLabel>
            <NativeSelect
              id="invite-role"
              name="role"
              defaultValue={
                state.status === "error"
                  ? (state.values?.role ?? "staff")
                  : "staff"
              }
              aria-invalid={state.fieldErrors?.role ? true : undefined}
              className="w-48"
            >
              {INVITABLE_ROLES.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {t(`roles.${role}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {state.fieldErrors?.role ? (
              <FieldError>
                {t(`validation.${state.fieldErrors.role}`)}
              </FieldError>
            ) : null}
          </Field>
          <SubmitButton className="self-start">
            {t("settings.invitations.submit")}
          </SubmitButton>
        </FieldGroup>
      </form>

      {link ? (
        <div className="flex flex-col gap-3">
          <FormSuccess>
            <strong>
              {t("settings.invitations.linkTitle", {
                email: state.values?.email ?? "",
              })}
            </strong>
            <br />
            {t("settings.invitations.linkHelp")}
          </FormSuccess>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={link}
              aria-label={t("settings.invitations.linkTitle", {
                email: state.values?.email ?? "",
              })}
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyButton
              value={link}
              label={t("settings.invitations.copy")}
              copiedLabel={t("settings.invitations.copied")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
