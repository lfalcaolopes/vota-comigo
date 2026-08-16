import { expect, test } from "@playwright/test";

test.describe("static product pages", () => {
  test("renders the methodology page", async ({ page }) => {
    // Arrange / Act
    await page.goto("/metodologia");

    // Assert
    await expect(
      page.getByRole("heading", {
        name: "Tudo aqui vem do registro oficial do mandato.",
      }),
    ).toBeVisible();
  });
});
