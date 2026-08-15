import { expect, test, type Page } from "@playwright/test";

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

function deputado(externalIdDeputado: number, percentual: number) {
  return {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: `Deputado ${externalIdDeputado} da Silva`,
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
      status: "comparavel",
      percentualSobreMedianaUf: percentual,
      siglaUf: "SP",
      anos: [
        {
          year: 2023,
          naComparacao: true,
          percentualSobreMedianaUf: percentual,
          diasEmExercicio: 334,
          diasNoAno: 334,
          medianaUfDeputadoCount: 70,
          dadoIncompleto: false,
        },
        {
          year: 2024,
          naComparacao: true,
          percentualSobreMedianaUf: percentual,
          diasEmExercicio: 366,
          diasNoAno: 366,
          medianaUfDeputadoCount: 70,
          dadoIncompleto: false,
        },
      ],
      anosNaComparacao: 2,
      diasEmExercicio: 700,
      diasNaComparacao: 700,
    },
  };
}

const comparativo = {
  janelasCoincidem: true,
  items: [deputado(20, 112), deputado(10, 88)],
};

function visibleText(page: Page, text: string) {
  return page.getByText(text).filter({ visible: true }).first();
}

async function routeComparativo(page: Page) {
  await page.route(
    "http://localhost:3001/comparativo-deputados?*",
    async (route) => {
      await route.fulfill({ json: comparativo });
    },
  );
}

test.describe("comparativo de deputados a partir da listagem", () => {
  test("compara os deputados do endereço linha a linha", async ({ page }) => {
    // Arrange
    await routeComparativo(page);

    // Act
    await page.goto("/deputados/comparativo/20,10");

    // Assert
    await expect(
      page.getByRole("heading", { name: "Comparar deputados" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(visibleText(page, "Presença registrada")).toBeVisible();
    await expect(visibleText(page, "Proposições assinadas")).toBeVisible();
    await expect(visibleText(page, "Órgãos distintos")).toBeVisible();
    await expect(visibleText(page, "57ª legislatura")).toBeVisible();
    await expect(visibleText(page, "12% acima da mediana")).toBeVisible();
    await expect(visibleText(page, "12% abaixo da mediana")).toBeVisible();
    await expect(
      visibleText(page, "Dados cobertos até dez/2024"),
    ).toBeVisible();
    await expect(page.getByText("R$")).toHaveCount(0);
  });

  test("leva de volta à listagem de deputados", async ({ page }) => {
    // Arrange
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");

    // Act
    const voltar = page.getByRole("link", { name: "Voltar aos deputados" });

    // Assert
    await expect(voltar).toHaveAttribute("href", "/deputados");
  });

  test("recusa um endereço com deputados repetidos", async ({ page }) => {
    // Arrange
    await routeComparativo(page);

    // Act
    await page.goto("/deputados/comparativo/20,20");

    // Assert
    await expect(
      page.getByRole("heading", { name: "Comparar deputados" }),
    ).toHaveCount(0);
  });
});
