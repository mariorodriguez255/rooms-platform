import { expect, type Page } from "@playwright/test";

import { emailLink } from "./mailpit";

// Fictitious users from supabase/seed.sql (local only).
export const SEED_PASSWORD = "rooms-demo-2026"; // secret-scan:allow gitleaks:allow (fictitious, local seed only)
export const SEED = {
  ana: {
    email: "ana@example.com",
    name: "Ana Ejemplo",
    org: "Pisos Ejemplo Norte",
  },
  // Staff of Ana's organization.
  bruno: {
    email: "bruno@example.com",
    name: "Bruno Prueba",
    org: "Pisos Ejemplo Norte",
  },
  carla: {
    email: "carla@example.com",
    name: "Carla Demo",
    org: "Habitaciones Demo Sur",
  },
} as const;

// Next keeps the previous page mounted but hidden (React <Activity>) so that
// going back is instant: after a client navigation the old form is still in
// the DOM. Only match what the user can see.
function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

// Subjects of Supabase's default email templates (our Spanish templates come
// with the custom SMTP, milestone 3).
export const EMAIL_SUBJECTS = {
  confirmation: "Confirm your email address",
  recovery: "Reset your password",
} as const;

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signIn(
  page: Page,
  email: string,
  password = SEED_PASSWORD,
) {
  await field(page, "Email").fill(email);
  await field(page, "Contraseña").fill(password);
  await page
    .getByRole("button", { name: "Entrar" })
    .filter({ visible: true })
    .click();
}

// Fills the signup form (already open) and follows the confirmation email.
export async function signUpAndConfirm(
  page: Page,
  name: string,
  email: string,
  password: string,
) {
  await field(page, "Nombre y apellidos").fill(name);
  await field(page, "Email").fill(email);
  await field(page, "Contraseña").fill(password);
  await page
    .getByRole("button", { name: "Crear cuenta" })
    .filter({ visible: true })
    .click();
  await expect(page.getByText("Revisa tu email")).toBeVisible();

  await page.goto(await emailLink(email, EMAIL_SUBJECTS.confirmation));
}
