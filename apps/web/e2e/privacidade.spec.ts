import { expect, test } from "@playwright/test";

test("opens the privacy notice from the footer", async ({ page }) => {
  // Arrange
  await page.goto("/");

  // Act
  await page.getByRole("link", { name: "Privacidade" }).click();

  // Assert
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Como tratamos os dados usados pelo site.",
    }),
  ).toBeVisible();
});
