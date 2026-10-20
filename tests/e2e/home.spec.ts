import { expect, test } from "@playwright/test";

test("home page loads in Spanish", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { level: 1, name: "rooms-platform" }),
  ).toBeVisible();
});
