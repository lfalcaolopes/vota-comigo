import { expect, test } from "@playwright/test";

// A home renderiza recortes vindos da API, entao os fluxos que dependem de
// dado real so podem ser exercitados com a pilha no ar.
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function isApiUp(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/deputados/feed?limit=1`);
    return response.ok;
  } catch {
    return false;
  }
}

test.describe("home", () => {
  test.describe("com a pilha real no ar", () => {
    test.beforeAll(async () => {
      test.skip(
        !(await isApiUp()),
        `API indisponível em ${apiBaseUrl}; os recortes da home dependem de dado real`,
      );
    });

    test("dispara a busca por um termo de exemplo", async ({ page }) => {
      // Arrange
      await page.goto("/");

      // Act
      await page.getByRole("link", { name: "imposto de renda" }).click();

      // Assert
      await expect(page).toHaveURL(/\/proposicoes\?q=imposto\+de\+renda/);
    });

    test("leva dos gastos da cota à lista de deputados", async ({ page }) => {
      // Arrange
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: /^Quanto os deputados gastaram de cota parlamentar/,
      });

      // Act
      await secao
        .getByRole("link", { name: "Ver o gasto de cada deputado" })
        .click();

      // Assert
      await expect(page).toHaveURL(/\/deputados$/);
    });

    test("abre uma proposta em destaque a partir da home", async ({ page }) => {
      // Arrange
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: "Quais propostas os deputados votaram",
      });

      // Act
      await secao.locator("article a").first().click();

      // Assert
      await expect(page).toHaveURL(/\/proposicoes\/\d+/);
    });
  });

  test.describe("no celular", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("mostra o exemplo de resultado já na abertura", async ({ page }) => {
      // Arrange / Act
      await page.goto("/");

      // Assert
      await expect(
        page.getByRole("figure", {
          name: "Exemplo de como um resultado de concordância aparece",
        }),
      ).toBeVisible();
    });
  });
});
