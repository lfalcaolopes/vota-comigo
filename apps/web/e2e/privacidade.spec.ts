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
      name: "Privacidade e proteção de dados",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Quais dados tratamos e para quê",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Seções do aviso de privacidade",
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Responsável e contato" }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="mailto:quemvotacomigo@gmail.com"]'),
  ).toBeVisible();
  await expect(page.getByText("Lucas Falcão Lopes")).toHaveCount(0);
});

test("clears data stored by the site in the browser", async ({ page }) => {
  // Arrange
  await page.goto("/privacidade");
  await page.evaluate(() => {
    window.localStorage.setItem("vota-comigo:first-touch", "first-touch");
    window.sessionStorage.setItem("vota-comigo:matcher-rascunho", "draft");
  });

  // Act
  await page
    .getByRole("button", { name: "Apagar dados deste navegador" })
    .click();

  // Assert
  await expect(
    page.getByText(
      "Os dados locais do Quem Vota Comigo foram apagados neste navegador.",
    ),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        firstTouch: window.localStorage.getItem("vota-comigo:first-touch"),
        matcherDraft: window.sessionStorage.getItem(
          "vota-comigo:matcher-rascunho",
        ),
      })),
    )
    .toEqual({ firstTouch: null, matcherDraft: null });
});
