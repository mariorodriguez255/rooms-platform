"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { resetPassword, type ResetPasswordField } from "../actions";

export function ResetPasswordForm() {
  const t = useTranslations();
  const [state, action] = useActionState(
    resetPassword,
    initialFormState as FormState<ResetPasswordField>,
  );

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormError error={state.error} />
        <TextField
          name="password"
          type="password"
          label={t("auth.resetPassword.newPassword")}
          description={t("auth.signup.passwordHint")}
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          error={state.fieldErrors?.password}
        />
        <TextField
          name="confirmPassword"
          type="password"
          label={t("auth.resetPassword.confirmPassword")}
          autoComplete="new-password"
          required
          error={state.fieldErrors?.confirmPassword}
        />
        <SubmitButton className="w-full">
          {t("auth.resetPassword.submit")}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
