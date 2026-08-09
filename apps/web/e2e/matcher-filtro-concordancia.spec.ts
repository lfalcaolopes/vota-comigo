import { expect, test, type Page } from "@playwright/test";

const selected = [
  {
    externalIdProposicao: 1,
    siglaTipo: "PL",
    numero: 2630,
    ano: 2020,
    ementa: "Estabelece regras para plataformas digitais.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2020-05-13",
    volumeVotacoesPlenario: 8,
    dataUltimaVotacao: "2023-05-02",
  },
  {
    externalIdProposicao: 2,
    siglaTipo: "PL",
    numero: 1904,
    ano: 2024,
    ementa: "Altera regras penais relacionadas à gestação.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2024-05-17",
    volumeVotacoesPlenario: 4,
    dataUltimaVotacao: "2024-06-12",
  },
  {
    externalIdProposicao: 3,
    siglaTipo: "PEC",
    numero: 45,
    ano: 2019,
    ementa: "Reorganiza a tributação sobre o consumo.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2019-04-03",
    volumeVotacoesPlenario: 12,
    dataUltimaVotacao: "2023-12-15",
  },
  {
    externalIdProposicao: 4,
    siglaTipo: "PL",
    numero: 4,
    ano: 2025,
    ementa: "Institui uma política ainda não avaliada pelo usuário.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2025-02-10",
    volumeVotacoesPlenario: 3,
    dataUltimaVotacao: "2025-03-11",
  },
];

const rascunho = {
  version: 1,
  siglaUf: "SP",
  cidade: "Campinas",
  escopo: "estadual",
  selected,
  posicoes: [
    { externalIdProposicao: 1, posicao: "aprovar" },
    { externalIdProposicao: 2, posicao: "rejeitar" },
    { externalIdProposicao: 3, posicao: "aprovar" },
    { externalIdProposicao: 4, posicao: "nao_sei" },
  ],
  externalIdProposicoesFiltroConcordancia: [],
};

const resultado = {
  siglaUf: "SP",
  cidade: "Campinas",
  totalProposicoesSelecionadas: 4,
  totalPosicoesComputaveis: 3,
  escopo: "estadual",
  deputados: [
    {
      externalIdDeputado: 10,
      nome: "Deputada Exemplo",
      partido: "ABC",
      siglaUf: "SP",
      urlFoto: null,
      compatibilidadeBruta: 75,
      amostraComparavel: 3,
      scoreOrdenacaoPercentual: 61,
      alertas: [],
      emAtividade: true,
    },
  ],
  totalDeputadosAvaliados: 1,
  deputadosHistoricoIncompleto: 0,
  total: 1,
  limit: 20,
  offset: 0,
  semBomMatch: false,
};

async function storeRascunho(page: Page, value = rascunho) {
  await page.goto("/");
  await page.evaluate((storedValue) => {
    window.sessionStorage.setItem(
      "vota-comigo:matcher-rascunho",
      JSON.stringify(storedValue),
    );
  }, value);
}

test.describe("filtro de concordância no resultado do matcher", () => {
  test("preserva as proposições marcadas ao recarregar o resultado", async ({
    page,
  }) => {
    // Arrange
    const requests: Array<{
      externalIdProposicoesFiltroConcordancia: number[];
    }> = [];
    await page.route("http://localhost:3001/matcher?**", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ json: resultado });
    });
    await storeRascunho(page, {
      ...rascunho,
      externalIdProposicoesFiltroConcordancia: [1],
    });
    await page.goto("/matcher/resultado");
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();

    // Act
    await page.reload();
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();

    // Assert
    expect(requests).toHaveLength(2);
    expect(
      requests.map(
        (request) => request.externalIdProposicoesFiltroConcordancia,
      ),
    ).toEqual([[1], [1]]);
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
  });

  test("preserva as proposições marcadas ao abrir o detalhe e voltar", async ({
    page,
  }) => {
    // Arrange
    let detalheRequest: {
      externalIdProposicoesFiltroConcordancia: number[];
    } | null = null;
    await page.route("http://localhost:3001/matcher?**", async (route) => {
      await route.fulfill({ json: resultado });
    });
    await page.route(
      "http://localhost:3001/matcher/deputados/10",
      async (route) => {
        detalheRequest = route.request().postDataJSON();
        await route.fulfill({ status: 500, json: {} });
      },
    );
    await storeRascunho(page, {
      ...rascunho,
      externalIdProposicoesFiltroConcordancia: [1],
    });
    await page.goto("/matcher/resultado");
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();

    // Act
    await page.getByRole("link", { name: /Deputada Exemplo/ }).click();
    await expect(page).toHaveURL(/\/matcher\/resultado\/10$/);
    await expect.poll(() => detalheRequest).not.toBeNull();
    await page.goBack();

    // Assert
    expect(detalheRequest).toMatchObject({
      externalIdProposicoesFiltroConcordancia: [1],
    });
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
    await page.getByText("Votou comigo (1)", { exact: true }).click();
    await expect(
      page.getByLabel("Exigir concordância em PL 2630/2020"),
    ).toBeChecked();
  });

  test("preserva as proposições marcadas ao ampliar o escopo", async ({
    page,
  }) => {
    // Arrange
    const requests: Array<{
      escopo: string;
      externalIdProposicoesFiltroConcordancia: number[];
    }> = [];
    await page.route("http://localhost:3001/matcher?**", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ json: { ...resultado, escopo: "nacional" } });
    });
    await storeRascunho(page, {
      ...rascunho,
      externalIdProposicoesFiltroConcordancia: [1],
    });
    await page.goto("/matcher/resultado");
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();

    // Act
    await page.getByRole("button", { name: "Brasil" }).click();

    // Assert
    await expect
      .poll(() => requests.at(-1))
      .toMatchObject({
        escopo: "nacional",
        externalIdProposicoesFiltroConcordancia: [1],
      });
    await expect(page).toHaveURL("/matcher/resultado?escopo=nacional");
  });

  test("preserva as proposições marcadas ao filtrar por atividade", async ({
    page,
  }) => {
    // Arrange
    const requests: Array<{
      apenasEmAtividade: boolean;
      externalIdProposicoesFiltroConcordancia: number[];
    }> = [];
    await page.route("http://localhost:3001/matcher?**", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ json: resultado });
    });
    await storeRascunho(page, {
      ...rascunho,
      externalIdProposicoesFiltroConcordancia: [1],
    });
    await page.goto("/matcher/resultado");
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();

    // Act
    await page.getByText("Apenas em atividade", { exact: true }).click();

    // Assert
    await expect
      .poll(() => requests.at(-1))
      .toMatchObject({
        apenasEmAtividade: true,
        externalIdProposicoesFiltroConcordancia: [1],
      });
    await expect(page).toHaveURL("/matcher/resultado?atividade=1");
  });

  test("oferece contexto apenas para posições computáveis sem buscar novos dados", async ({
    page,
  }) => {
    // Arrange
    let matcherRequests = 0;
    await page.route("http://localhost:3001/matcher?**", async (route) => {
      matcherRequests += 1;
      await route.fulfill({ json: resultado });
    });
    await storeRascunho(page);
    await page.goto("/matcher/resultado");
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();
    const requestsBeforeOpening = matcherRequests;

    // Act
    await page.getByText("Votou comigo", { exact: true }).click();

    // Assert
    await expect(page.getByText("PL 2630/2020", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Estabelece regras para plataformas digitais."),
    ).toBeVisible();
    await expect(
      page.getByText("Deveria ser aprovada", { exact: true }),
    ).toHaveCount(2);
    await expect(
      page.getByText("Não deveria ser aprovada", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("PL 4/2025")).toHaveCount(0);
    expect(matcherRequests).toBe(requestsBeforeOpening);
  });

  test("explicita o recorte aplicado e permite limpar todas as marcações", async ({
    page,
  }) => {
    // Arrange
    const requests: Array<{
      externalIdProposicoesFiltroConcordancia: number[];
    }> = [];
    await page.route("http://localhost:3001/matcher?**", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ json: resultado });
    });
    await storeRascunho(page);
    await page.goto("/matcher/resultado");
    await expect(page.getByText("Deputada Exemplo")).toBeVisible();
    await page.getByText("Votou comigo", { exact: true }).click();

    // Act
    await page.getByLabel("Exigir concordância em PL 2630/2020").press("Space");

    // Assert
    await expect
      .poll(() => requests.at(-1)?.externalIdProposicoesFiltroConcordancia)
      .toEqual([1]);
    await expect(
      page.getByLabel("Exigir concordância em PL 2630/2020"),
    ).toBeChecked();
    await expect(
      page.getByRole("heading", {
        name: "Deputados que votaram com você nas proposições marcadas",
      }),
    ).toBeVisible();
    const panel = page.locator("details").filter({ hasText: "Votou comigo" });
    if ((await panel.getAttribute("open")) !== null) {
      await page.getByText("Votou comigo (1)", { exact: true }).click();
    }
    await expect(panel).not.toHaveAttribute("open", "");
    await expect(
      page.getByText("Votou comigo (1)", { exact: true }),
    ).toBeVisible();

    // Act
    await page.getByRole("button", { name: "Limpar filtro" }).click();

    // Assert
    await expect
      .poll(() => requests.at(-1)?.externalIdProposicoesFiltroConcordancia)
      .toEqual([]);
    await expect(page.getByText("Votou comigo", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Deputados que votaram com você nas proposições marcadas",
      }),
    ).toHaveCount(0);
  });
});
