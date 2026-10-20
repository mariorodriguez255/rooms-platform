"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError, FormSuccess } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { signUp, type SignUpField } from "../actions";

export function SignupForm() {
  const t = useTranslations();
  const next = useSearchParams().get("next") ?? "";
  const [state, action] = useActionState(
    signUp,
    initialFormState as FormState<SignUpField>,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-medium">{t("auth.signup.checkEmailTitle")}</h2>
        <FormSuccess>
          {t("auth.signup.checkEmail", { email: state.values?.email ?? "" })}
        </FormSuccess>
      </div>
    );
  }

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="flex flex-col gap-6">
      <form action={action} noValidate>
        <input type="hidden" name="next" value={next} />
        <FieldGroup>
          <FormError error={state.error} />
          <TextField
            name="fullName"
            label={t("common.fullName")}
            autoComplete="name"
            required
            maxLength={100}
            defaultValue={state.values?.fullName ?? ""}
            error={state.fieldErrors?.fullName}
          />
          <TextField
            name="email"
            type="email"
            label={t("common.email")}
            autoComplete="email"
            required
            defaultValue={state.values?.email ?? ""}
            error={state.fieldErrors?.email}
          />
          <TextField
            name="password"
            type="password"
            label={t("common.password")}
            description={t("auth.signup.passwordHint")}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            error={state.fieldErrors?.password}
          />
          <SubmitButton className="w-full">
            {t("auth.signup.submit")}
          </SubmitButton>
        </FieldGroup>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.signup.hasAccount")}{" "}
        <Link
          href={loginHref}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {t("auth.signup.loginLink")}
        </Link>
      </p>
    </div>
  );
}
