import { expect, test, type Page } from "@playwright/test";

const rascunho = {
  version: 1,
  siglaUf: "SP",
  cidade: "",
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

const detalhe = {
  siglaUf: "SP",
  cidade: null,
  totalProposicoesSelecionadas: 3,
  totalPosicoesComputaveis: 3,
  deputado: {
    externalIdDeputado: 220593,
    nome: "Maria da Silva",
    partido: "PT",
    siglaUf: "SP",
    urlFoto: null,
    emAtividade: true,
  },
  metrics: {
    totalConcordancias: 3,
    totalDiscordancias: 0,
    totalForaDoDenominador: 0,
    amostraComparavel: 3,
    coberturaExercicio: 3,
    compatibilidadeBruta: 100,
    scoreOrdenacaoPercentual: 60,
    alertas: [],
  },
  votos: [],
};

const resultado = {
  siglaUf: "SP",
  cidade: null,
  totalProposicoesSelecionadas: 3,
  totalPosicoesComputaveis: 3,
  escopo: "estadual",
  deputados: [
    {
      externalIdDeputado: 220593,
      nome: "Maria da Silva",
      partido: "PT",
      siglaUf: "SP",
      urlFoto: null,
      emAtividade: true,
      compatibilidadeBruta: 100,
      amostraComparavel: 3,
      scoreOrdenacaoPercentual: 60,
      alertas: [],
    },
  ],
  totalDeputadosAvaliados: 1,
  deputadosHistoricoIncompleto: 0,
  total: 1,
  limit: 20,
  offset: 0,
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

test.describe("detalhe de resultado do matcher", () => {
  test("recarrega somente o detalhe a partir do rascunho", async ({ page }) => {
    // Arrange
    let detalheRequests = 0;
    let resultadoRequests = 0;
    await storeRascunho(page);
    await page.route(
      "http://localhost:3001/matcher/deputados/220593",
      async (route) => {
        detalheRequests += 1;
        await route.fulfill({ json: detalhe });
      },
    );
    await page.route("http://localhost:3001/matcher?*", async (route) => {
      resultadoRequests += 1;
      await route.fulfill({ json: {} });
    });

    // Act
    await page.goto("/matcher/resultado/220593");
    await expect(page.getByText("Maria da Silva")).toBeVisible({
      timeout: 15_000,
    });
    await page.reload();
    await expect(page.getByText("Maria da Silva")).toBeVisible({
      timeout: 15_000,
    });

    // Assert
    expect(detalheRequests).toBe(2);
    expect(resultadoRequests).toBe(0);
  });

  test("volta do detalhe para a lista de resultados pelo histórico", async ({
    page,
  }) => {
    // Arrange
    await storeRascunho(page);
    await page.route(
      "http://localhost:3001/matcher/deputados/220593",
      async (route) => {
        await route.fulfill({ json: detalhe });
      },
    );
    await page.route("http://localhost:3001/matcher?*", async (route) => {
      await route.fulfill({ json: resultado });
    });
    await page.goto("/matcher/resultado");

    // Act
    await page.getByRole("link", { name: /Maria da Silva/ }).click();
    await expect(page).toHaveURL(/\/matcher\/resultado\/220593$/);
    await expect(
      page.getByRole("button", { name: "Voltar ao resultado" }),
    ).toHaveCount(0);
    await page.goBack();

    // Assert
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
    await expect(
      page.getByRole("link", { name: /Maria da Silva/ }),
    ).toBeVisible();
  });

  test("permite repetir a requisição de detalhe depois de uma falha", async ({
    page,
  }) => {
    // Arrange
    let detalheRequests = 0;
    await storeRascunho(page);
    await page.route(
      "http://localhost:3001/matcher/deputados/220593",
      async (route) => {
        if (route.request().method() === "OPTIONS") {
          await route.fulfill({
            status: 204,
            headers: {
              "access-control-allow-headers": "content-type",
              "access-control-allow-methods": "POST",
              "access-control-allow-origin": "*",
            },
          });
          return;
        }
        detalheRequests += 1;
        if (detalheRequests === 1) {
          await route.fulfill({
            status: 500,
            headers: {
              "access-control-allow-origin": "*",
            },
          });
          return;
        }
        await route.fulfill({
          json: detalhe,
          headers: {
            "access-control-allow-origin": "*",
          },
        });
      },
    );
    await page.goto("/matcher/resultado/220593");

    // Act
    await page.getByRole("button", { name: "Tentar novamente" }).click();

    // Assert
    await expect(page.getByText("Maria da Silva")).toBeVisible();
    expect(detalheRequests).toBe(2);
  });

  test("redireciona ao passo possível quando o rascunho é insuficiente", async ({
    page,
  }) => {
    // Arrange
    let detalheRequests = 0;
    await page.route(
      "http://localhost:3001/matcher/deputados/220593",
      async (route) => {
        detalheRequests += 1;
        await route.fulfill({ json: detalhe });
      },
    );

    // Act
    await page.goto("/matcher/resultado/220593");

    // Assert
    await expect(page).toHaveURL(/\/matcher\/local$/);
    await expect(
      page.getByRole("heading", { name: "Escolha o estado" }),
    ).toBeVisible();
    expect(detalheRequests).toBe(0);
  });
});
