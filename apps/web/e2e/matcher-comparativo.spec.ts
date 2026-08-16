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

function detalhe(externalIdDeputado: number) {
  return {
    siglaUf: "SP",
    cidade: null,
    totalProposicoesSelecionadas: 3,
    totalPosicoesComputaveis: 3,
    deputado: {
      externalIdDeputado,
      nome: `Deputado ${externalIdDeputado}`,
      partido: "PP",
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
}

function perfil(externalIdDeputado: number) {
  return {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: null,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: `Deputado ${externalIdDeputado}`,
      siglaPartido: "PP",
      siglaUf: "SP",
      urlFoto: null,
    },
    emAtividade: true,
    redesSociais: [],
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    externalIdLegislaturaInicial: null,
    externalIdLegislaturaFinal: null,
    legislaturaInicialPeriodo: null,
    legislaturaFinalPeriodo: null,
    resumoPresencaDisponivel: false,
    resumoPresenca: null,
    historicoPartidarioDisponivel: false,
    historicoPartidario: [],
  };
}

const resultado = {
  siglaUf: "SP",
  cidade: null,
  totalProposicoesSelecionadas: 3,
  totalPosicoesComputaveis: 3,
  escopo: "estadual",
  deputados: [20, 10].map((externalIdDeputado) => ({
    externalIdDeputado,
    nome: `Deputado ${externalIdDeputado}`,
    partido: "PP",
    siglaUf: "SP",
    urlFoto: null,
    emAtividade: true,
    compatibilidadeBruta: 100,
    amostraComparavel: 3,
    scoreOrdenacaoPercentual: 60,
    alertas: [],
  })),
  totalDeputadosAvaliados: 2,
  deputadosHistoricoIncompleto: 0,
  total: 2,
  limit: 20,
  offset: 0,
};

const JANELA_57 = {
  status: "disponivel" as const,
  legislatura: 57,
  dataInicio: "2023-02-01",
  dataFim: "2025-04-10T00:00:00.000Z",
  encerrada: true,
  diasEmExercicioDisponivel: true,
  diasEmExercicio: 800,
  coberturaAte: "2024-12-31",
  divisorAnosEfetivos: 2,
};

function comparativoDeputado(externalIdDeputado: number) {
  return {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: null,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    emAtividade: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: `Deputado ${externalIdDeputado}`,
      siglaPartido: "PP",
      siglaUf: "SP",
      urlFoto: null,
    },
    janela: JANELA_57,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 92,
      presencas: 92,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 8,
    },
    proposicoesAssinadas: {
      disponivel: true,
      total: 12,
      totalPrimeiroSignatario: 3,
      coveredThroughDate: "2025-08-14",
    },
    orgaos: { items: [], total: 0 },
    cota: {
      status: "sem-comparacao",
      motivo: "sem-mediana-na-janela",
      anos: [],
    },
  };
}

const comparativoGeral = {
  janelasCoincidem: true,
  items: [comparativoDeputado(20), comparativoDeputado(10)],
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

test.describe("comparativo de deputados do matcher", () => {
  test("recalcula detalhes e perfis pela rota sem buscar o ranking", async ({
    page,
  }) => {
    // Arrange
    let detalheRequests = 0;
    let perfilRequests = 0;
    let resultadoRequests = 0;
    await storeRascunho(page);
    await page.route(
      /http:\/\/localhost:3001\/matcher\/deputados\/(20|10)$/,
      async (route) => {
        detalheRequests += 1;
        const id = Number(route.request().url().split("/").at(-1));
        await route.fulfill({ json: detalhe(id) });
      },
    );
    await page.route(
      /http:\/\/localhost:3001\/deputados\/(20|10)$/,
      async (route) => {
        perfilRequests += 1;
        const id = Number(route.request().url().split("/").at(-1));
        await route.fulfill({ json: perfil(id) });
      },
    );
    await page.route("http://localhost:3001/matcher?*", async (route) => {
      resultadoRequests += 1;
      await route.fulfill({ json: resultado });
    });

    // Act
    await page.goto("/matcher/comparativo/20,10");

    // Assert
    await expect(
      page.getByRole("heading", { name: "Comparativo de deputados" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Deputado 20").first()).toBeVisible();
    await expect(page.getByText("Deputado 10").first()).toBeVisible();
    expect(detalheRequests).toBe(2);
    expect(perfilRequests).toBe(2);
    expect(resultadoRequests).toBe(0);

    // Act
    await page.getByRole("button", { name: "Voltar ao resultado" }).click();

    // Assert
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
    await expect(
      page.getByRole("button", { name: "Comparar deputados" }),
    ).toBeVisible();
  });

  test("abre a rota na ordem selecionada e volta ao resultado em modo normal", async ({
    page,
  }) => {
    // Arrange
    await storeRascunho(page);
    await page.route("http://localhost:3001/matcher?*", async (route) => {
      await route.fulfill({ json: resultado });
    });
    await page.route(
      /http:\/\/localhost:3001\/matcher\/deputados\/(20|10)$/,
      async (route) => {
        const id = Number(route.request().url().split("/").at(-1));
        await route.fulfill({ json: detalhe(id) });
      },
    );
    await page.route(
      /http:\/\/localhost:3001\/deputados\/(20|10)$/,
      async (route) => {
        const id = Number(route.request().url().split("/").at(-1));
        await route.fulfill({ json: perfil(id) });
      },
    );
    await page.goto("/matcher/resultado");

    // Act
    await page.getByRole("button", { name: "Comparar deputados" }).click();
    await page.getByText("Deputado 10", { exact: true }).first().click();
    await page.getByText("Deputado 20", { exact: true }).first().click();
    await page.getByRole("button", { name: "Comparar", exact: true }).click();

    // Assert
    await expect(page).toHaveURL(/\/matcher\/comparativo\/10,20$/);
    await expect(
      page.getByRole("heading", { name: "Comparativo de deputados" }),
    ).toBeVisible();

    // Act
    await page.goBack();

    // Assert
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
    await expect(
      page.getByRole("button", { name: "Comparar deputados" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /para comparação$/ }),
    ).toHaveCount(0);
  });

  test("alterna entre a grade de votos e os dados gerais na mesma tela", async ({
    page,
  }) => {
    // Arrange
    let comparativoRequests = 0;
    await storeRascunho(page);
    await page.route(
      /http:\/\/localhost:3001\/matcher\/deputados\/(20|10)$/,
      async (route) => {
        const id = Number(route.request().url().split("/").at(-1));
        await route.fulfill({ json: detalhe(id) });
      },
    );
    await page.route(
      /http:\/\/localhost:3001\/deputados\/(20|10)$/,
      async (route) => {
        const id = Number(route.request().url().split("/").at(-1));
        await route.fulfill({ json: perfil(id) });
      },
    );
    await page.route(
      "http://localhost:3001/comparativo-deputados?*",
      async (route) => {
        comparativoRequests += 1;
        await route.fulfill({ json: comparativoGeral });
      },
    );
    await page.goto("/matcher/comparativo/20,10");
    await expect(
      page.getByRole("heading", { name: "Comparativo de deputados" }),
    ).toBeVisible({ timeout: 15_000 });

    // Act
    await page.getByRole("button", { name: "Dados gerais" }).click();

    // Assert
    await expect(
      page.getByText("Presença registrada").filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Proposições assinadas").filter({ visible: true }).first(),
    ).toBeVisible();
    expect(comparativoRequests).toBe(1);

    // Act
    await page.getByRole("button", { name: "Votos comparados" }).click();

    // Assert
    await expect(page.getByText("Presença registrada")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Voltar ao resultado" }),
    ).toBeVisible();
  });

  test("redireciona identificadores inválidos ao resultado", async ({
    page,
  }) => {
    // Arrange
    await storeRascunho(page);
    await page.route("http://localhost:3001/matcher?*", async (route) => {
      await route.fulfill({ json: resultado });
    });

    // Act
    await page.goto("/matcher/comparativo/20,20");

    // Assert
    await expect(page).toHaveURL(/\/matcher\/resultado$/);
    await expect(
      page.getByRole("button", { name: "Comparar deputados" }),
    ).toBeVisible();
  });

  test("redireciona ao passo possível quando não há rascunho", async ({
    page,
  }) => {
    // Arrange
    let detalheRequests = 0;
    await page.route(
      /http:\/\/localhost:3001\/matcher\/deputados\/(20|10)$/,
      async (route) => {
        detalheRequests += 1;
        await route.fulfill({ json: detalhe(20) });
      },
    );

    // Act
    await page.goto("/matcher/comparativo/20,10");

    // Assert
    await expect(page).toHaveURL(/\/matcher\/local$/);
    await expect(
      page.getByRole("heading", { name: "Onde você vota" }),
    ).toBeVisible();
    expect(detalheRequests).toBe(0);
  });
});
