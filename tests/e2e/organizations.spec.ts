import { expect, test } from "@playwright/test";

import { SEED, signIn, signUpAndConfirm, uniqueEmail } from "./support/auth";

// Milestone 1 "done when": two organizations cannot see each other's data.
test("members of one organization never see another organization", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page, SEED.carla.email);

  await expect(
    page.getByText(`Estás trabajando en ${SEED.carla.org}.`),
  ).toBeVisible();
  await page.getByRole("button", { name: SEED.carla.org }).click();
  await expect(page.getByRole("menuitem", { name: SEED.ana.org })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");

  await page.goto("/settings/members");
  await expect(page.getByText(SEED.carla.email, { exact: true })).toBeVisible();
  await expect(page.getByText(SEED.ana.email)).toHaveCount(0);
});

test("an owner invites someone, who signs up through the link and joins as staff", async ({
  page,
  browser,
}) => {
  const inviteeEmail = uniqueEmail("invitee");

  // The owner generates the link.
  await page.goto("/login?next=/settings/members");
  await signIn(page, SEED.ana.email);
  await page.getByLabel("Email de la persona").fill(inviteeEmail);
  await page.getByLabel("Rol", { exact: true }).selectOption("staff");
  await page.getByRole("button", { name: "Generar enlace" }).click();
  const link = await page
    .getByRole("textbox", { name: /Enlace de invitación/ })
    .inputValue();
  expect(link).toMatch(/\/invite\/[0-9a-f]{64}$/);
  await expect(page.getByText(inviteeEmail, { exact: true })).toBeVisible(); // pending list

  // The invitee opens it in their own browser, without an account yet.
  const inviteeContext = await browser.newContext();
  const invitee = await inviteeContext.newPage();
  await invitee.goto(link);
  await expect(invitee).toHaveURL(/\/login\?next=%2Finvite%2F/);
  await invitee.getByRole("link", { name: "Crea una" }).click();
  await signUpAndConfirm(
    invitee,
    "Iván Invitado",
    inviteeEmail,
    "contraseña del invitado",
  );

  // The confirmation email brings them back to the invitation.
  await expect(invitee).toHaveURL(/\/invite\/[0-9a-f]{64}$/);
  await expect(
    invitee.getByText(
      `Te han invitado a unirte a ${SEED.ana.org} como equipo.`,
    ),
  ).toBeVisible();
  await invitee.getByRole("button", { name: "Aceptar invitación" }).click();
  await expect(invitee).toHaveURL(/\/dashboard$/);
  await expect(
    invitee.getByText(`Estás trabajando en ${SEED.ana.org}.`),
  ).toBeVisible();

  // As staff they see the members but cannot manage them.
  await invitee.goto("/settings/members");
  await expect(invitee.getByText(inviteeEmail, { exact: true })).toBeVisible();
  await expect(
    invitee.getByRole("heading", { name: "Invitar a alguien" }),
  ).toHaveCount(0);
  await expect(invitee.getByRole("combobox")).toHaveCount(0);

  // The used link no longer works for anybody else.
  await page.getByRole("button", { name: SEED.ana.org }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(link);
  await signIn(page, SEED.carla.email);
  await expect(page.getByText("Esta invitación ya se ha usado.")).toBeVisible();

  await inviteeContext.close();
});
