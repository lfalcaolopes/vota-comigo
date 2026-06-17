import { expect, test } from "@playwright/test";

test.describe("static product pages", () => {
  test("renders the about page", async ({ page }) => {
    // Arrange / Act
    await page.goto("/sobre");

    // Assert
    await expect(
      page.getByRole("heading", {
        name: "Compare suas posições com votos reais da Câmara.",
      }),
    ).toBeVisible();
  });
});
