"use server";

import { redirect } from "next/navigation";

import { HOME_PATH, authConfirmUrl, safeNextPath } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { errorKeyFrom } from "@/lib/errors";
import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import {
  fieldErrorsFrom,
  formValues,
  type FormState,
} from "@/lib/validation/form";

// Server Actions of the auth pages. Each one validates its input with Zod;
// Supabase Auth applies its own rules and rate limits on top.

const SIGN_IN_FIELDS = ["email", "password", "next"] as const;
export type SignInField = (typeof SIGN_IN_FIELDS)[number];

export async function signIn(
  _previous: FormState<SignInField>,
  formData: FormData,
): Promise<FormState<SignInField>> {
  const values = formValues(formData, SIGN_IN_FIELDS);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email: values.email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      status: "error",
      error: errorKeyFrom(error),
      values: { email: values.email },
    };
  }

  redirect(safeNextPath(values.next));
}

const RESEND_FIELDS = ["email", "next"] as const;

export async function resendConfirmation(
  _previous: FormState<SignInField>,
  formData: FormData,
): Promise<FormState<SignInField>> {
  const values = formValues(formData, RESEND_FIELDS);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { email: values.email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: authConfirmUrl(await getRequestOrigin(), values.next),
    },
  });
  if (error) {
    return {
      status: "error",
      error: errorKeyFrom(error),
      values: { email: values.email },
    };
  }
  return { status: "success", values: { email: parsed.data.email } };
}

const SIGN_UP_FIELDS = ["fullName", "email", "password", "next"] as const;
export type SignUpField = (typeof SIGN_UP_FIELDS)[number];

export async function signUp(
  _previous: FormState<SignUpField>,
  formData: FormData,
): Promise<FormState<SignUpField>> {
  const values = formValues(formData, SIGN_UP_FIELDS);
  const kept = { fullName: values.fullName, email: values.email };
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: kept,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: authConfirmUrl(await getRequestOrigin(), values.next),
    },
  });
  if (error) {
    return { status: "error", error: errorKeyFrom(error), values: kept };
  }

  // Same answer whether or not the email already had an account: the form
  // must not reveal who is registered. Supabase does not error either.
  return { status: "success", values: { email: parsed.data.email } };
}

const FORGOT_PASSWORD_FIELDS = ["email"] as const;
export type ForgotPasswordField = (typeof FORGOT_PASSWORD_FIELDS)[number];

export async function requestPasswordReset(
  _previous: FormState<ForgotPasswordField>,
  formData: FormData,
): Promise<FormState<ForgotPasswordField>> {
  const values = formValues(formData, FORGOT_PASSWORD_FIELDS);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: authConfirmUrl(await getRequestOrigin(), "/reset-password"),
    },
  );
  if (error) {
    return { status: "error", error: errorKeyFrom(error), values };
  }
  // Same answer for unknown emails (no account enumeration).
  return { status: "success", values: { email: parsed.data.email } };
}

const RESET_PASSWORD_FIELDS = ["password", "confirmPassword"] as const;
export type ResetPasswordField = (typeof RESET_PASSWORD_FIELDS)[number];

export async function resetPassword(
  _previous: FormState<ResetPasswordField>,
  formData: FormData,
): Promise<FormState<ResetPasswordField>> {
  // The recovery link signed the user in (see /auth/confirm).
  await requireUser();
  const parsed = resetPasswordSchema.safeParse(
    formValues(formData, RESET_PASSWORD_FIELDS),
  );
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { status: "error", error: errorKeyFrom(error) };
  }
  redirect(HOME_PATH);
}
