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

function deputado(
  externalIdDeputado: number,
  percentual: number,
  gastoNaComparacaoCents: number,
) {
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
      gastoNaComparacaoCents,
      medianaNaComparacaoCents: Math.round(
        (gastoNaComparacaoCents / percentual) * 100,
      ),
      tetoNaComparacaoCents: 200_000_000,
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
  items: [deputado(20, 112, 160_000_000), deputado(10, 88, 90_000_000)],
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
    await expect(visibleText(page, "Propostas assinadas")).toBeVisible();
    await expect(visibleText(page, "Comissões e órgãos")).toBeVisible();
    await expect(page.getByText("Legislaturas diferentes")).toHaveCount(0);
    await expect(
      visibleText(page, "Dados cobertos até dez/2024"),
    ).toBeVisible();
    await expect(visibleText(page, "R$ 800 mil/ano")).toBeVisible();
    await expect(
      visibleText(page, "80% do teto · 12% acima da mediana do SP"),
    ).toBeVisible();
    await expect(
      visibleText(page, "R$ 1,6 mi de R$ 2 mi em 2 anos"),
    ).toBeVisible();
    await expect(visibleText(page, "R$ 450 mil/ano")).toBeVisible();
    await expect(
      visibleText(page, "45% do teto · 12% abaixo da mediana do SP"),
    ).toBeVisible();
  });

  test("explica a cota parlamentar em um popover ancorado", async ({
    page,
  }) => {
    // Arrange
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");
    const ajuda = page
      .getByRole("button", {
        name: "Mais informações sobre Gasto da cota parlamentar",
      })
      .filter({ visible: true })
      .first();
    await expect(ajuda).toBeVisible({ timeout: 15_000 });

    // Act
    await ajuda.click();

    // Assert
    const popover = page.getByRole("dialog");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(
      "custeia as despesas do mandato, como passagens aéreas",
    );
  });

  test("mantém o popover dentro da janela quando o gatilho está no rodapé", async ({
    page,
  }) => {
    // Arrange
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");
    const ajuda = page
      .getByRole("button", {
        name: "Mais informações sobre Gasto da cota parlamentar",
      })
      .filter({ visible: true })
      .first();
    await expect(ajuda).toBeVisible({ timeout: 15_000 });
    const viewport = page.viewportSize();
    if (viewport === null) throw new Error("viewport indisponível");
    const gatilho = await ajuda.boundingBox();
    if (gatilho === null) throw new Error("gatilho sem posição");
    await page.mouse.wheel(0, gatilho.y - viewport.height + gatilho.height + 8);
    await page.waitForTimeout(200);

    // Act
    await ajuda.click();

    // Assert
    const caixa = await page.getByRole("dialog").boundingBox();
    if (caixa === null) throw new Error("popover sem posição");
    expect(caixa.y).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(viewport.height);
  });

  test("fecha o popover da cota pelo X, por fora e pelo Escape", async ({
    page,
  }) => {
    // Arrange
    await page.setViewportSize({ width: 390, height: 780 });
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");
    const ajuda = page
      .getByRole("button", {
        name: "Mais informações sobre Gasto da cota parlamentar",
      })
      .filter({ visible: true })
      .first();
    await expect(ajuda).toBeVisible({ timeout: 15_000 });
    const popover = page.getByRole("dialog");

    // Act
    await ajuda.click();
    await expect(popover).toBeVisible();
    await page.getByRole("button", { name: "Fechar" }).click();

    // Assert
    await expect(popover).toBeHidden();

    // Act
    await ajuda.click();
    await expect(popover).toBeVisible();
    await page.mouse.click(5, 5);

    // Assert
    await expect(popover).toBeHidden();

    // Act
    await ajuda.click();
    await expect(popover).toBeVisible();
    await page.keyboard.press("Escape");

    // Assert
    await expect(popover).toBeHidden();
    await expect(ajuda).toBeFocused();
  });

  test("prende o foco dentro do popover enquanto ele está aberto", async ({
    page,
  }) => {
    // Arrange
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");
    const ajuda = page
      .getByRole("button", {
        name: "Mais informações sobre Gasto da cota parlamentar",
      })
      .filter({ visible: true })
      .first();
    await expect(ajuda).toBeVisible({ timeout: 15_000 });

    // Act
    await ajuda.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");

    // Assert
    const focado = page.locator(":focus");
    await expect(focado).toBeVisible();
    await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  });

  test("copia os deputados comparados como texto puro", async ({ page }) => {
    // Arrange
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");
    const copiar = page.getByRole("button", { name: "Copiar em texto" });
    await expect(copiar).toBeVisible({ timeout: 15_000 });

    // Act
    await copiar.click();

    // Assert
    await expect(page.getByRole("status")).toHaveText("Copiado");
    const texto = await page.evaluate(() => navigator.clipboard.readText());
    expect(texto).toContain("Quem Vota Comigo — deputados de interesse");
    expect(texto).toContain("· 2 deputados comparados");
    expect(texto).toContain("- Deputado 20 (PP-SP)");
    expect(texto).toMatch(/\n {2}https?:\/\/[^\n]+\/deputados\/20\n/);
    expect(texto).not.toContain("compatibilidade");
  });

  test("oferece o texto para cópia manual quando a área de transferência falha", async ({
    page,
  }) => {
    // Arrange
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error("sem permissão")),
        },
      });
    });
    await routeComparativo(page);
    await page.goto("/deputados/comparativo/20,10");
    const copiar = page.getByRole("button", { name: "Copiar em texto" });
    await expect(copiar).toBeVisible({ timeout: 15_000 });

    // Act
    await copiar.click();

    // Assert
    const popover = page.getByRole("dialog");
    await expect(popover).toBeVisible();
    await expect(popover.locator("textarea")).toHaveValue(
      /Quem Vota Comigo — deputados de interesse/,
    );
    await expect(page.getByRole("status")).toHaveText("");
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
