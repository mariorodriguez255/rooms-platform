import { z } from "zod";

// Error messages are keys of the "validation" messages (see form.ts).

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(254, "emailInvalid")
  .pipe(z.email("emailInvalid"));

// Same rule as supabase/config.toml (minimum_password_length = 12). 72 is
// the bcrypt limit that Supabase Auth enforces.
export const newPasswordSchema = z
  .string()
  .min(12, "passwordTooShort")
  .max(72, "passwordTooLong");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "required")
  .max(100, "tooLong");

export const signInSchema = z.object({
  email: emailSchema,
  // Not newPasswordSchema: a wrong password must get the generic
  // "invalid credentials" answer, not a hint about the rules.
  password: z.string().min(1, "required"),
});

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDontMatch",
    path: ["confirmPassword"],
  });
