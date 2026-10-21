import { expect, test, type Page } from "@playwright/test";

import { SEED, signIn } from "./support/auth";

// Milestone 2: properties, rooms, photos and the room board. Tests run in
// parallel (and twice: desktop and mobile) against the same seed, so what
// they create has unique names and what they assert tolerates the rest.

const SEED_PROPERTY = "a1a1a1a1-0000-4000-8000-000000000001";

function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

function unique(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function roomCard(page: Page, name: string) {
  return page.getByRole("link").filter({ hasText: name });
}

// Milestone 2 "done when": the operator sees the state of every room on
// one screen.
test("the board shows the state of every room, grouped by property", async ({
  page,
}) => {
  await page.goto("/login");
  await signIn(page, SEED.ana.email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Habitaciones" }),
  ).toBeVisible();

  // Seed dates are relative to the day of the reset (supabase/seed.sql).
  await expect(
    page.getByRole("heading", { name: /Piso Calle Ficticia/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Piso Avenida Inventada/ }),
  ).toBeVisible();
  await expect(roomCard(page, "Habitación 1")).toContainText("Libre");
  await expect(roomCard(page, "Habitación 2")).toContainText("Se libera el");
  await expect(roomCard(page, "Habitación 3")).toContainText("Ocupada");
  await expect(roomCard(page, "Habitación 4")).toContainText("No disponible");
  await expect(roomCard(page, "Habitación A")).toContainText("Libre desde el");
  await expect(roomCard(page, "Habitación B")).toContainText(
    "Revisar: debía liberarse el",
  );

  // Filters are links: only the rooms of that group remain.
  await page.getByRole("link", { name: /^Se liberan pronto/ }).click();
  await expect(page).toHaveURL(/status=soon/);
  await expect(roomCard(page, "Habitación 2")).toBeVisible();
  await expect(roomCard(page, "Habitación B")).toBeVisible();
  await expect(roomCard(page, "Habitación 1")).toHaveCount(0);
  await expect(roomCard(page, "Habitación 3")).toHaveCount(0);

  // Another organization's rooms never appear.
  await expect(page.getByText("Habitación Sur 1")).toHaveCount(0);
});

test("an operator adds a property and a room, with a photo, and deletes them", async ({
  page,
}) => {
  const propertyName = unique("Piso E2E");
  const roomName = unique("Habitación E2E");

  await page.goto("/login?next=/properties/new");
  await signIn(page, SEED.ana.email);

  // Property, with an error first: the form keeps what was typed.
  await field(page, "Nombre").fill(propertyName);
  await field(page, "Dirección").fill("Calle Inventada 5, 2.º A");
  await field(page, "Municipio").fill("Pamplona");
  await page
    .getByRole("button", { name: "Crear piso" })
    .filter({ visible: true })
    .click();
  await expect(page.getByText("Elige una comunidad autónoma.")).toBeVisible();
  await expect(field(page, "Nombre")).toHaveValue(propertyName);
  await field(page, "Comunidad autónoma").selectOption("ES-NC");
  await page
    .getByRole("button", { name: "Crear piso" })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: propertyName }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Calle Inventada 5, 2.º A · Pamplona · Comunidad Foral de Navarra",
    ),
  ).toBeVisible();

  // Room, occupied until a later date.
  await page.getByRole("link", { name: "Añadir habitación" }).click();
  await field(page, "Nombre").fill(roomName);
  await field(page, "Renta mensual (€)").fill("455,50");
  await field(page, "Superficie (m², opcional)").fill("11,5");
  await field(page, "Estado").selectOption("occupied");
  const in10Days = new Date(Date.now() + 10 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await field(page, "Fecha de liberación (opcional)").fill(in10Days);
  await page.getByLabel("Balcón").check();
  await page
    .getByRole("button", { name: "Crear habitación" })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: roomName }),
  ).toBeVisible();
  await expect(page.getByText("455,50 €/mes · 11,5 m²")).toBeVisible();
  await expect(page.getByText(/Se libera el/)).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Balcón" }),
  ).toBeVisible();

  // It shows up on the board, in its group.
  await page.goto("/dashboard?status=soon");
  await expect(roomCard(page, roomName)).toContainText("Se libera el");

  // A photo: a generated image (never a real one), resized in the browser.
  await page.goto("/dashboard");
  await roomCard(page, roomName).click();
  // Larger than 2048 px so that the browser has to resize it. JPEG and
  // base64 keep generating and passing it fast.
  const image = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 2000;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 3000, 2000);
    gradient.addColorStop(0, "#4f86c6");
    gradient.addColorStop(1, "#f2c14e");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 3000, 2000);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1]!;
  });
  await page.getByTestId("photo-input").setInputFiles({
    name: "habitacion.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(image, "base64"),
  });
  const photo = page.getByRole("img", { name: `Foto 1 de ${roomName}` });
  await expect(photo).toBeVisible();
  // Resized to 2048 px on the long side.
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(2048);
  await expect(page.getByText("1 de 20 fotos")).toBeVisible();

  await page.getByRole("button", { name: "Borrar foto" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Borrar foto" })
    .click();
  await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();

  // Deleting the room, then the property (Ana is an owner).
  await page.getByRole("button", { name: "Borrar habitación" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Borrar habitación" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: propertyName }),
  ).toBeVisible();
  // Earlier pages stay mounted but hidden (see support/auth.ts), and
  // Next's route announcer repeats the previous title: look in <main>.
  await expect(
    page.getByRole("main").getByText(roomName).filter({ visible: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Borrar piso" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Borrar piso" })
    .click();
  await expect(page).toHaveURL(/\/properties$/);
  // Earlier pages stay mounted but hidden (see support/auth.ts), and
  // Next's route announcer repeats the previous title: look in <main>.
  await expect(
    page.getByRole("main").getByText(propertyName).filter({ visible: true }),
  ).toHaveCount(0);
});

test("staff edits but does not delete properties and rooms", async ({
  page,
}) => {
  await page.goto(`/login?next=/properties/${SEED_PROPERTY}`);
  await signIn(page, SEED.bruno.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Piso Calle Ficticia" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Borrar piso" })).toHaveCount(
    0,
  );

  await page.getByRole("link", { name: "Habitación 1" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Habitación 1" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Borrar habitación" }),
  ).toHaveCount(0);
});

test("another organization cannot open a property by its address", async ({
  page,
}) => {
  await page.goto(`/login?next=/properties/${SEED_PROPERTY}`);
  await signIn(page, SEED.carla.email);
  await expect(
    page.getByText("No encontramos este piso. Puede que lo hayan borrado."),
  ).toBeVisible();
  await expect(page.getByText("Piso Calle Ficticia")).toHaveCount(0);
});
