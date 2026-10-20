import { expect, test } from "@playwright/test";

import { emailLink } from "./support/mailpit";
import {
  EMAIL_SUBJECTS,
  SEED,
  signIn,
  signUpAndConfirm,
  uniqueEmail,
} from "./support/auth";

test("a protected page sends visitors to sign in and back", async ({
  page,
}) => {
  await page.goto("/settings/members");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fmembers$/);

  await signIn(page, SEED.ana.email);
  await expect(page).toHaveURL(/\/settings\/members$/);
  await expect(page.getByText(SEED.ana.email, { exact: true })).toBeVisible();
});

test("a wrong password gets a generic error", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, SEED.ana.email, "not-the-password");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "El email o la contraseña no son correctos." }),
  ).toBeVisible();
});

test("a new operator signs up, confirms the email and creates an organization", async ({
  page,
}) => {
  const email = uniqueEmail("operator");
  await page.goto("/signup");
  await signUpAndConfirm(
    page,
    "Olga Operadora",
    email,
    "una frase larga de prueba",
  );

  // Without an organization, the dashboard sends the user to onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nombre de la organización").fill("Pisos de Olga");
  await page.getByRole("button", { name: "Crear organización" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByText("Estás trabajando en Pisos de Olga."),
  ).toBeVisible();

  // Sign out and back in.
  await page.getByRole("button", { name: "Pisos de Olga" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, email, "una frase larga de prueba");
  await expect(
    page.getByText("Estás trabajando en Pisos de Olga."),
  ).toBeVisible();
});

test("a forgotten password can be reset from the email", async ({ page }) => {
  const email = uniqueEmail("forgetful");
  await page.goto("/signup");
  await signUpAndConfirm(
    page,
    "Fede Olvidadizo",
    email,
    "la primera contraseña",
  );
  await page.getByRole("button", { name: "Mi cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText(/te hemos enviado un enlace/)).toBeVisible();

  await page.goto(await emailLink(email, EMAIL_SUBJECTS.recovery));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("Contraseña nueva").fill("la segunda contraseña");
  await page.getByLabel("Repite la contraseña").fill("la segunda contraseña");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("an invalid email link explains what happened", async ({ page }) => {
  await page.goto(
    "/auth/confirm?token_hash=invalid&type=email&next=/dashboard",
  );
  await expect(page).toHaveURL(/\/login\?error=link_invalid$/);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "El enlace no es válido o ha caducado" }),
  ).toBeVisible();
});

test("a confirmation link opened in another browser confirms the email", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("elsewhere");
  await page.goto("/signup");
  await page.getByLabel("Nombre y apellidos").fill("Elsa Otronavegador");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("contraseña de otro navegador");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Revisa tu email")).toBeVisible();

  // A different browser has no PKCE verifier cookie: no session, but the
  // email is confirmed and the user is told to sign in.
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await other.goto(await emailLink(email, EMAIL_SUBJECTS.confirmation));
  await expect(other).toHaveURL(/\/login\?error=link_other_browser$/);
  await expect(
    other.getByRole("alert").filter({ hasText: "ya está confirmado" }),
  ).toBeVisible();
  await signIn(other, email, "contraseña de otro navegador");
  await expect(other).toHaveURL(/\/onboarding$/);
  await otherContext.close();
});
