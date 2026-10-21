import { expect, test, type Page } from "@playwright/test";

import { SEED, signIn } from "./support/auth";
import { findEmail } from "./support/mailpit";

// Milestone 3: the public application form. Tests run in parallel (and on
// desktop and mobile) against the seed: what they create has unique names.

// Fixed public tokens of supabase/seed.sql.
const OPEN_ROOM = "/apply/a1000000000000000000000000000001"; // secret-scan:allow (seed token)
const UNAVAILABLE_ROOM = "/apply/a1000000000000000000000000000004"; // secret-scan:allow (seed token)
const SEED_PROPERTY_2 = "a1a1a1a1-0000-4000-8000-000000000002";

function unique(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@example.net`;
}

// Each test applies from its own IP: the form allows 5 submissions per IP
// every 10 minutes. (On Vercel the header cannot be forged: Vercel sets it.)
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${octet()}.${octet()}`,
  });
});

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function fillApplication(page: Page, name: string) {
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Email").fill(emailFor(name));
  await page.getByLabel("Teléfono (opcional)").fill("600 123 456");
  await page.getByLabel("¿Desde qué fecha quieres entrar?").fill(inDays(20));
  await page.getByLabel("¿Cuánto tiempo piensas quedarte?").selectOption("9");
  await page.getByLabel("¿A qué te dedicas?").selectOption("worker");
  await page
    .getByLabel("Ingresos netos mensuales aproximados (€, opcional)")
    .fill("1.800");
  await page.getByLabel("Horario habitual").selectOption("morning");
  await page
    .getByLabel("¿Teletrabajas o estudias desde casa?")
    .selectOption("sometimes");
  for (const [habit, value] of [
    ["Orden y limpieza en zonas comunes", "4"],
    ["Ruido y música en casa", "2"],
    ["Visitas en casa", "2"],
    ["Uso del salón y la cocina", "3"],
  ] as const) {
    await page
      .getByRole("group", { name: habit })
      .getByLabel(value, { exact: true })
      .check();
  }
  await page
    .getByRole("group", { name: "¿Fumas?" })
    .getByLabel("No", { exact: true })
    .check();
  await page
    .getByRole("group", { name: "¿Tienes mascota?" })
    .getByLabel("No", { exact: true })
    .check();
  await page
    .getByLabel("Preséntate (opcional)")
    .fill("Trabajo de mañanas y busco un piso tranquilo.");
  await page.getByLabel("Soy mayor de edad.").check();
  await page
    .getByLabel(/^He leído la información sobre protección de datos/)
    .check();
}

async function submit(page: Page) {
  await page.getByRole("button", { name: "Enviar candidatura" }).click();
}

// Milestone 3 "done when": a candidate applies from a phone without an
// account (the mobile project runs it on a Pixel 7).
test("a candidate applies without an account, and the operator sees it", async ({
  page,
}) => {
  const name = unique("Candidata E2E");

  await page.goto(OPEN_ROOM);
  await expect(
    page.getByRole("heading", { level: 1, name: "Habitación 1" }),
  ).toBeVisible();
  await expect(page.getByText("Madrid, Comunidad de Madrid")).toBeVisible();
  // Never the address.
  await expect(page.getByText("Calle Ficticia")).toHaveCount(0);
  await expect(
    page.getByText("Responsable: Pisos Ejemplo Norte", { exact: false }),
  ).toBeVisible();

  await fillApplication(page, name);
  await submit(page);
  await expect(page.getByText("Candidatura enviada")).toBeVisible();
  await expect(page.getByText(`Gracias, ${name}.`)).toBeVisible();

  // Confirmation to the candidate; replies go to the operator.
  const confirmation = await findEmail(
    emailFor(name),
    "Hemos recibido tu candidatura",
  );
  expect(confirmation.Subject).toBe(
    "Hemos recibido tu candidatura: Habitación 1, Madrid",
  );
  expect(confirmation.ReplyTo?.[0]?.Address).toBe(
    "privacidad-norte@example.com",
  );

  // Notice to the members, with a link and without the answers.
  const notice = await findEmail(
    SEED.ana.email,
    `Nueva candidatura de ${name}`,
  );
  expect(notice.Text).not.toContain("1800");
  const link = /https?:\/\/\S+\/applications\/[0-9a-f-]{36}/.exec(
    notice.Text,
  )?.[0];
  expect(link).toBeTruthy();

  // The operator opens it.
  await page.goto(`/login?next=${new URL(link!).pathname}`);
  await signIn(page, SEED.ana.email);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(emailFor(name))).toBeVisible();
  await expect(page.getByText("9 meses")).toBeVisible();
  await expect(page.getByText("1800 €/mes")).toBeVisible();
  await expect(page.getByText(/Aceptado el .*2026-10-21/)).toBeVisible();

  // And it is listed on the room's page.
  await page.getByRole("link", { name: "← Habitación 1" }).click();
  await expect(
    page.getByRole("main").getByRole("link", { name }),
  ).toBeVisible();
});

test("the form explains what is missing and keeps what was typed", async ({
  page,
}) => {
  const name = unique("Candidato Olvidadizo");
  await page.goto(OPEN_ROOM);
  await fillApplication(page, name);
  await page
    .getByLabel(/^He leído la información sobre protección de datos/)
    .uncheck();
  await page.getByLabel("Email").fill("no-es-un-email");
  await submit(page);

  await expect(
    page.getByText(
      "Necesitamos tu consentimiento para gestionar la candidatura.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Escribe un email válido.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue(name);
  await expect(
    page
      .getByRole("group", { name: "Ruido y música en casa" })
      .getByLabel("2", {
        exact: true,
      }),
  ).toBeChecked();
});

test("a closed room and an unknown link explain themselves", async ({
  page,
}) => {
  await page.goto(UNAVAILABLE_ROOM);
  await expect(
    page.getByText("Esta habitación no admite candidaturas ahora"),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveCount(0);

  await page.goto("/apply/00000000000000000000000000000000");
  await expect(page.getByText("Este enlace no funciona")).toBeVisible();
});

test("bots that fill the hidden field get a success page and store nothing", async ({
  page,
}) => {
  const name = unique("Bot E2E");
  await page.goto(OPEN_ROOM);
  await fillApplication(page, name);
  await page
    .locator('input[name="website"]')
    .evaluate(
      (input: HTMLInputElement) => (input.value = "http://spam.example"),
    );
  await submit(page);
  await expect(page.getByText("Candidatura enviada")).toBeVisible();

  await page.goto("/login?next=/dashboard");
  await signIn(page, SEED.ana.email);
  await page
    .getByRole("link")
    .filter({ hasText: "Habitación 1" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 2, name: /Candidaturas/ }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText(name)).toHaveCount(0);
});

test("the operator replaces a room's link and the old one stops working", async ({
  page,
  context,
}) => {
  const roomName = unique("Habitación Enlace");

  await page.goto(`/login?next=/properties/${SEED_PROPERTY_2}/rooms/new`);
  await signIn(page, SEED.ana.email);
  await page.getByLabel("Nombre").fill(roomName);
  await page.getByLabel("Renta mensual (€)").fill("400");
  await page.getByRole("button", { name: "Crear habitación" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: roomName }),
  ).toBeVisible();

  const linkField = page.getByLabel(`Enlace para candidatos de ${roomName}`);
  const oldLink = await linkField.inputValue();
  expect(oldLink).toMatch(/\/apply\/[0-9a-f]{32}$/);

  const visitor = await context.newPage();
  await visitor.goto(oldLink);
  await expect(
    visitor.getByRole("heading", { level: 1, name: roomName }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Generar enlace nuevo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Generar enlace nuevo" })
    .click();
  await expect(linkField).not.toHaveValue(oldLink);
  const newLink = await linkField.inputValue();

  await visitor.goto(oldLink);
  await expect(visitor.getByText("Este enlace no funciona")).toBeVisible();
  await visitor.goto(newLink);
  await expect(
    visitor.getByRole("heading", { level: 1, name: roomName }),
  ).toBeVisible();

  // Clean up: a room without applications can be deleted.
  await page.getByRole("button", { name: "Borrar habitación" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Borrar habitación" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/properties/${SEED_PROPERTY_2}$`));
});

test("a room with applications cannot be deleted", async ({ page }) => {
  await page.goto("/login?next=/dashboard");
  await signIn(page, SEED.ana.email);
  await page
    .getByRole("link")
    .filter({ hasText: "Habitación 1" })
    .first()
    .click();
  await page.getByRole("button", { name: "Borrar habitación" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Borrar habitación" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "Esta habitación tiene candidaturas y no se puede borrar. Márcala como No disponible.",
      ),
  ).toBeVisible();
});
