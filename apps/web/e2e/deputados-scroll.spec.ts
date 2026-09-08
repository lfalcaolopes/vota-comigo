import { expect, test } from "@playwright/test";

test("abre perfis no topo após navegar a partir da lista", async ({ page }) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Arrange
    await page.goto("/deputados");
    const profileLink = page
      .locator('article a[href^="/deputados/"]')
      .last();
    await profileLink.scrollIntoViewIfNeeded();

    // Act
    await profileLink.click();
    await expect(page).toHaveURL(/\/deputados\/\d+-/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Assert
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
});
