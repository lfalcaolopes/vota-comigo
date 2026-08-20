import { expect, test, type Page } from "@playwright/test";

const rascunho = {
  version: 2,
  siglaUf: "SP",
  escopo: "estadual",
  selected: [1, 2, 3].map((externalIdProposicao) => ({
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
  })),
  posicoes: [
    { externalIdProposicao: 1, posicao: "aprovar" },
    { externalIdProposicao: 2, posicao: "rejeitar" },
    { externalIdProposicao: 3, posicao: "aprovar" },
  ],
};

async function storeRascunho(page: Page) {
  await page.goto("/");
  await page.evaluate((value) => {
    window.sessionStorage.setItem(
      "vota-comigo:matcher-rascunho",
      JSON.stringify(value),
    );
  }, rascunho);
}

test.describe("entrada do matcher sem rascunho", () => {
  test("apresenta o processo antes de iniciar a comparação", async ({
    page,
  }) => {
    // Arrange / Act
    await page.goto("/matcher");

    // Assert
    await expect(
      page.getByRole("heading", {
        name: "Compare suas posições com votos reais da Câmara",
      }),
    ).toBeVisible();
    await expect(page.getByText("Declare suas posições")).toBeVisible();
    await expect(page).toHaveURL(/\/matcher$/);
  });

  test("inicia uma nova comparação por escolha explícita", async ({ page }) => {
    // Arrange
    await page.goto("/matcher");

    // Act
    await page.getByRole("button", { name: "Começar comparação" }).click();

    // Assert
    await expect(page).toHaveURL(/\/matcher\/local$/);
    await expect(page.getByLabel("Estado (UF)")).toHaveValue("");
  });
});

test.describe("entrada do matcher com rascunho", () => {
  test("pede uma escolha antes de retomar pela raiz", async ({ page }) => {
    // Arrange
    await storeRascunho(page);

    // Act
    await page.goto("/matcher");

    // Assert
    await expect(
      page.getByRole("heading", {
        name: "Você tem uma comparação em andamento",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/matcher$/);
    await expect(page.getByText("Propostas escolhidas")).toBeVisible();
    await expect(page.getByText("Posições respondidas")).toBeVisible();
  });

  test("retoma o passo mais avançado por escolha explícita", async ({
    page,
  }) => {
    // Arrange
    await storeRascunho(page);
    await page.goto("/matcher");

    // Act
    await page.getByRole("button", { name: "Continuar de onde parei" }).click();

    // Assert
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
  });

  test("apaga o rascunho ao começar novamente", async ({ page }) => {
    // Arrange
    await storeRascunho(page);
    await page.goto("/matcher");

    // Act
    await page.getByRole("button", { name: "Recomeçar do zero" }).click();

    // Assert
    await expect(
      page.getByRole("heading", {
        name: "Compare suas posições com votos reais da Câmara",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/matcher$/);
    const stored = await page.evaluate(() =>
      window.sessionStorage.getItem("vota-comigo:matcher-rascunho"),
    );
    expect(stored).toBeNull();
  });
});
