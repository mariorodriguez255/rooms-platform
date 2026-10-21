import { describe, expect, it } from "vitest";

import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { fieldErrorsFrom, formValues } from "@/lib/validation/form";
import {
  changeRoleSchema,
  invitationSchema,
  invitationTokenSchema,
  organizationSchema,
  organizationSettingsSchema,
} from "@/lib/validation/organization";

describe("auth schemas", () => {
  it("normalizes emails", () => {
    const result = signInSchema.parse({
      email: "  Ana@Example.COM ",
      password: "x",
    });
    expect(result.email).toBe("ana@example.com");
  });

  it("requires 12 to 72 characters for a new password", () => {
    const base = { fullName: "Ana", email: "ana@example.com" };
    expect(
      signUpSchema.safeParse({ ...base, password: "a".repeat(11) }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...base, password: "a".repeat(12) }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ ...base, password: "a".repeat(73) }).success,
    ).toBe(false);
  });

  it("does not apply the new-password rules when signing in", () => {
    expect(
      signInSchema.safeParse({ email: "ana@example.com", password: "short" })
        .success,
    ).toBe(true);
  });

  it("reports validation messages as translation keys, per field", () => {
    const result = signUpSchema.safeParse({
      fullName: " ",
      email: "nope",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      fullName: "required",
      email: "emailInvalid",
      password: "passwordTooShort", // secret-scan:allow (message key)
    });
  });

  it("checks that both new passwords match", () => {
    const result = resetPasswordSchema.safeParse({
      password: "a long enough password",
      confirmPassword: "another long password",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      confirmPassword: "passwordsDontMatch", // secret-scan:allow (message key)
    });
  });
});

describe("organization schemas", () => {
  it("trims names and enforces the database limits", () => {
    expect(organizationSchema.parse({ name: "  Pisos Centro " }).name).toBe(
      "Pisos Centro",
    );
    expect(organizationSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(
      organizationSchema.safeParse({ name: "x".repeat(101) }).success,
    ).toBe(false);
  });

  it("takes an optional contact email for candidates", () => {
    expect(
      organizationSettingsSchema.parse({
        name: "Pisos Centro",
        contactEmail: " Privacidad@Example.com ",
      }).contactEmail,
    ).toBe("privacidad@example.com");
    expect(
      organizationSettingsSchema.parse({
        name: "Pisos Centro",
        contactEmail: "",
      }).contactEmail,
    ).toBeNull();
    expect(
      organizationSettingsSchema.safeParse({
        name: "Pisos Centro",
        contactEmail: "nope",
      }).success,
    ).toBe(false);
  });

  it("only invites admins and staff", () => {
    expect(
      invitationSchema.safeParse({ email: "a@example.com", role: "staff" })
        .success,
    ).toBe(true);
    expect(
      invitationSchema.safeParse({ email: "a@example.com", role: "owner" })
        .success,
    ).toBe(false);
  });

  it("validates ids and tokens", () => {
    expect(
      changeRoleSchema.safeParse({ memberId: "not-a-uuid", role: "staff" })
        .success,
    ).toBe(false);
    expect(invitationTokenSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(invitationTokenSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(invitationTokenSchema.safeParse("../../etc").success).toBe(false);
  });
});

describe("formValues", () => {
  it("reads text fields and turns missing or file fields into empty strings", () => {
    const formData = new FormData();
    formData.set("email", "ana@example.com");
    formData.set("file", new Blob(["x"]));
    expect(formValues(formData, ["email", "file", "missing"])).toEqual({
      email: "ana@example.com",
      file: "",
      missing: "",
    });
  });
});
