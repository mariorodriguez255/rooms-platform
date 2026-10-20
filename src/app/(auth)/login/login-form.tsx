"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError, FormSuccess } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/validation/form";

import { resendConfirmation, signIn, type SignInField } from "../actions";

export function LoginForm() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const linkInvalid = searchParams.get("error") === "link_invalid";

  const [state, action] = useActionState(
    signIn,
    initialFormState as FormState<SignInField>,
  );
  const [resendState, resendAction] = useActionState(
    resendConfirmation,
    initialFormState as FormState<SignInField>,
  );

  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";
  const email = state.values?.email ?? "";

  return (
    <div className="flex flex-col gap-6">
      {linkInvalid && state.status === "idle" ? (
        <FormError error="linkInvalid" />
      ) : null}

      <form action={action} noValidate>
        <input type="hidden" name="next" value={next} />
        <FieldGroup>
          <FormError error={state.error} />
          <TextField
            name="email"
            type="email"
            label={t("common.email")}
            autoComplete="email"
            required
            defaultValue={email}
            error={state.fieldErrors?.email}
          />
          <TextField
            name="password"
            type="password"
            label={t("common.password")}
            autoComplete="current-password"
            required
            error={state.fieldErrors?.password}
          />
          <SubmitButton className="w-full">
            {t("auth.login.submit")}
          </SubmitButton>
        </FieldGroup>
      </form>

      {state.error === "emailNotConfirmed" ? (
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          {resendState.status === "success" ? (
            <FormSuccess>{t("auth.login.resent")}</FormSuccess>
          ) : (
            <>
              <FormError error={resendState.error} />
              <SubmitButton variant="outline" className="w-full">
                {t("auth.login.resend")}
              </SubmitButton>
            </>
          )}
        </form>
      ) : null}

      <div className="flex flex-col items-center gap-2 text-sm">
        <Button asChild variant="link" size="sm">
          <Link href="/forgot-password">{t("auth.login.forgotPassword")}</Link>
        </Button>
        <p className="text-muted-foreground">
          {t("auth.login.noAccount")}{" "}
          <Link
            href={signupHref}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
