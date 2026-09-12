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
      await page.getByRole("link", { name: "Porte de arma" }).click();

      // Assert
      await expect(page).toHaveURL(/\/proposicoes\?q=porte\+de\+arma/);
    });

    test("leva dos gastos da cota à lista de deputados", async ({ page }) => {
      // Arrange
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: "O uso da cota parlamentar",
      });

      // Act
      await secao
        .getByRole("link", { name: "Ver o gasto de cada deputado" })
        .click();

      // Assert
      await expect(page).toHaveURL(/\/deputados$/);
    });

    test("apresenta os gastos antes do convite final", async ({ page }) => {
      // Arrange / Act
      await page.goto("/");
      const secoes = page.locator("main > section");

      // Assert
      await expect(secoes.nth(2)).toHaveAccessibleName(
        "Conheça os deputados além dos votos",
      );
      await expect(secoes.nth(3)).toHaveAccessibleName(
        "O uso da cota parlamentar",
      );
      await expect(secoes.nth(4)).toHaveAccessibleName(
        "Compare antes de escolher",
      );
    });

    test("abre uma proposta em destaque a partir da home", async ({ page }) => {
      // Arrange
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: "Os deputados votam propostas. Esses votos entram na comparação.",
      });

      // Act
      await secao.locator("article a").first().click();

      // Assert
      await expect(page).toHaveURL(/\/proposicoes\/\d+/);
    });

    test("recorta a amostra pelo estado que a borda identificou", async ({
      browser,
    }) => {
      // Arrange
      const context = await browser.newContext({
        extraHTTPHeaders: {
          "x-vercel-ip-country": "BR",
          "x-vercel-ip-country-region": "PE",
        },
      });
      const page = await context.newPage();

      // Act
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: "Conheça os deputados além dos votos",
      });

      // Assert
      await expect(secao.getByText("Deputados de Pernambuco.")).toBeVisible();
      await expect(secao.locator("article").first()).toContainText("· PE");
      await context.close();
    });

    test("mostra o recorte nacional quando não há estado na borda", async ({
      page,
    }) => {
      // Arrange / Act
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: "Conheça os deputados além dos votos",
      });

      // Assert
      await expect(
        secao.getByText("Deputados de todo o Brasil."),
      ).toBeVisible();
    });

    test("abre o perfil de um deputado da amostra", async ({ page }) => {
      // Arrange
      await page.goto("/");
      const secao = page.getByRole("region", {
        name: "Conheça os deputados além dos votos",
      });

      // Act
      await secao.locator("article a").first().click();

      // Assert
      await expect(page).toHaveURL(/\/deputados\/\d+/);
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
