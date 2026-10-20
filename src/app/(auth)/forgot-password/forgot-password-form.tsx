"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError, FormSuccess } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { requestPasswordReset, type ForgotPasswordField } from "../actions";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [state, action] = useActionState(
    requestPasswordReset,
    initialFormState as FormState<ForgotPasswordField>,
  );

  return (
    <div className="flex flex-col gap-6">
      {state.status === "success" ? (
        <FormSuccess>
          {t("auth.forgotPassword.sent", { email: state.values?.email ?? "" })}
        </FormSuccess>
      ) : (
        <form action={action} noValidate>
          <FieldGroup>
            <FormError error={state.error} />
            <TextField
              name="email"
              type="email"
              label={t("common.email")}
              autoComplete="email"
              required
              defaultValue={state.values?.email ?? ""}
              error={state.fieldErrors?.email}
            />
            <SubmitButton className="w-full">
              {t("auth.forgotPassword.submit")}
            </SubmitButton>
          </FieldGroup>
        </form>
      )}
      <Button asChild variant="link" size="sm">
        <Link href="/login">{t("auth.forgotPassword.backToLogin")}</Link>
      </Button>
    </div>
  );
}
