import { expect, test, type Page } from "@playwright/test";

function abrirFiltros(page: Page) {
  return page.getByRole("button", { name: /^Filtros/ });
}

function painel(page: Page) {
  return page.getByRole("dialog");
}

function concordancia(page: Page, identificador: string) {
  return painel(page).getByLabel(`Exigir concordância em ${identificador}`, {
    exact: true,
  });
}

function aplicar(page: Page) {
  return painel(page).getByRole("button", { name: "Aplicar" });
}

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
  escopo: "estadual",
  selected,
  posicoes: [
    { externalIdProposicao: 1, posicao: "aprovar" },
    { externalIdProposicao: 2, posicao: "rejeitar" },
    { externalIdProposicao: 3, posicao: "aprovar" },
    { externalIdProposicao: 4, posicao: "nao_sei" },
  ],
  externalIdProposicoesFiltroConcordancia: [] as number[],
};

const resultado = {
  siglaUf: "SP",
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

test.describe("filtros do resultado do matcher", () => {
  test.describe("aplicação em bloco", () => {
    test("aplica atividade e concordância com uma única execução", async ({
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
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();
      const executadasAntes = requests.length;

      // Act
      await abrirFiltros(page).click();
      await painel(page).getByText("Apenas em atividade").click();
      await concordancia(page, "PL 2630/2020").press("Space");
      await aplicar(page).click();

      // Assert
      await expect(painel(page)).toBeHidden();
      await expect
        .poll(() => requests.at(-1))
        .toMatchObject({
          apenasEmAtividade: true,
          externalIdProposicoesFiltroConcordancia: [1],
        });
      expect(requests).toHaveLength(executadasAntes + 1);
      await expect(page).toHaveURL("/matcher/resultado?atividade=1");
    });

    test("mantém Aplicar desabilitado enquanto o rascunho não muda", async ({
      page,
    }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page, {
        ...rascunho,
        externalIdProposicoesFiltroConcordancia: [1],
      });
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();

      // Act
      await abrirFiltros(page).click();

      // Assert
      await expect(aplicar(page)).toBeDisabled();

      // Act
      await concordancia(page, "PL 1904/2024").press("Space");

      // Assert
      await expect(aplicar(page)).toBeEnabled();
    });

    test("descarta o rascunho ao fechar sem aplicar", async ({ page }) => {
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
      const executadasAntes = requests.length;

      // Act
      await abrirFiltros(page).click();
      await concordancia(page, "PL 1904/2024").press("Space");
      await page.keyboard.press("Escape");
      await expect(painel(page)).toBeHidden();
      await abrirFiltros(page).click();

      // Assert
      await expect(concordancia(page, "PL 2630/2020")).toBeChecked();
      await expect(concordancia(page, "PL 1904/2024")).not.toBeChecked();
      expect(requests).toHaveLength(executadasAntes);
    });

    test("limpa a seleção do rascunho sem executar antes do Aplicar", async ({
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
      const executadasAntes = requests.length;
      await abrirFiltros(page).click();

      // Act
      await painel(page)
        .getByRole("button", { name: "Limpar seleção" })
        .click();

      // Assert
      await expect(concordancia(page, "PL 2630/2020")).not.toBeChecked();
      expect(requests).toHaveLength(executadasAntes);

      // Act
      await aplicar(page).click();

      // Assert
      await expect
        .poll(() => requests.at(-1)?.externalIdProposicoesFiltroConcordancia)
        .toEqual([]);
    });
  });

  test.describe("recorte visível fora do painel", () => {
    test("conta apenas os filtros fora do padrão", async ({ page }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page);

      // Act
      await page.goto("/matcher/resultado");

      // Assert
      await expect(abrirFiltros(page)).toHaveText("Filtros");

      // Act
      await abrirFiltros(page).click();
      await concordancia(page, "PL 2630/2020").press("Space");
      await aplicar(page).click();

      // Assert
      await expect(abrirFiltros(page)).toContainText("1");
      await expect(
        page.getByRole("button", {
          name: "Remover filtro Concordância: 1 proposta",
        }),
      ).toBeVisible();
    });

    test("remove as marcações pelo chip, sem abrir o painel", async ({
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
        externalIdProposicoesFiltroConcordancia: [1, 2],
      });
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();

      // Act
      await page
        .getByRole("button", {
          name: "Remover filtro Concordância: 2 propostas",
        })
        .click();

      // Assert
      await expect(painel(page)).toBeHidden();
      await expect
        .poll(() => requests.at(-1)?.externalIdProposicoesFiltroConcordancia)
        .toEqual([]);
      await expect(abrirFiltros(page)).toHaveText("Filtros");
    });

    test("limpa os filtros preservando o escopo", async ({ page }) => {
      // Arrange
      const requests: Array<{
        escopo: string;
        apenasEmAtividade: boolean;
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
      await page.goto("/matcher/resultado?escopo=nacional&atividade=1");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();

      // Act
      await page.getByRole("button", { name: "Limpar filtros" }).click();

      // Assert
      await expect
        .poll(() => requests.at(-1))
        .toMatchObject({
          escopo: "nacional",
          apenasEmAtividade: false,
          externalIdProposicoesFiltroConcordancia: [],
        });
      await expect(page).toHaveURL("/matcher/resultado?escopo=nacional");
    });
  });

  test.describe("acessibilidade do painel", () => {
    test("devolve o foco ao gatilho ao fechar o painel", async ({ page }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();
      const trigger = abrirFiltros(page);
      await trigger.click();

      // Act
      await painel(page)
        .getByRole("button", { name: "Fechar filtros" })
        .click();

      // Assert
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });

    test("mantém o foco no gatilho depois de aplicar por teclado", async ({
      page,
    }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page, {
        ...rascunho,
        externalIdProposicoesFiltroConcordancia: [1],
      });
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();
      const trigger = abrirFiltros(page);
      await trigger.click();
      await concordancia(page, "PL 2630/2020").press("Space");

      // Act
      await aplicar(page).focus();
      await page.keyboard.press("Enter");

      // Assert
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });

    test("anuncia o total do recorte depois de aplicar uma marcação", async ({
      page,
    }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        const request = route.request().postDataJSON();
        await route.fulfill({
          json:
            request.externalIdProposicoesFiltroConcordancia.length === 0
              ? resultado
              : {
                  ...resultado,
                  deputados: [
                    ...resultado.deputados,
                    {
                      ...resultado.deputados[0],
                      externalIdDeputado: 11,
                      nome: "Deputado Exemplo Dois",
                    },
                  ],
                  total: 2,
                  totalDeputadosAvaliados: 2,
                },
        });
      });
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await abrirFiltros(page).click();

      // Act
      await concordancia(page, "PL 2630/2020").press("Space");
      await aplicar(page).click();

      // Assert
      await expect(
        page.locator('[role="status"]').filter({
          hasText: "Resultado atualizado: 2 deputados no resultado.",
        }),
      ).toBeAttached();
    });

    test("anuncia o resultado vazio deixado pelo recorte", async ({ page }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        const request = route.request().postDataJSON();
        await route.fulfill({
          json:
            request.externalIdProposicoesFiltroConcordancia.length === 0
              ? resultado
              : { ...resultado, deputados: [], total: 0 },
        });
      });
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();
      await abrirFiltros(page).click();

      // Act
      await concordancia(page, "PL 2630/2020").press("Space");
      await aplicar(page).click();

      // Assert
      await expect(
        page.locator('[role="status"]').filter({
          hasText:
            "Resultado atualizado: nenhum deputado votou com você em todas as propostas marcadas.",
        }),
      ).toBeAttached();
      await expect(abrirFiltros(page)).toBeFocused();
    });
  });

  test.describe("quando o filtro deixa o resultado vazio", () => {
    test("explica quando as propostas marcadas eliminam todos os deputados", async ({
      page,
    }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({
          json: { ...resultado, deputados: [], total: 0 },
        });
      });
      await storeRascunho(page, {
        ...rascunho,
        externalIdProposicoesFiltroConcordancia: [1, 2],
      });

      // Act
      await page.goto("/matcher/resultado");

      // Assert
      await expect(
        page.getByRole("heading", {
          name: "Nenhum deputado votou como você em todas",
        }),
      ).toBeVisible();
      await expect(
        page.getByText("O filtro exige concordância nas 2 propostas marcadas."),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Nenhum comparável neste estado" }),
      ).toHaveCount(0);
    });

    test("permite afrouxar o filtro sem abrir o painel", async ({ page }) => {
      // Arrange
      const requests: Array<{
        externalIdProposicoesFiltroConcordancia: number[];
      }> = [];
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        const request = route.request().postDataJSON();
        requests.push(request);
        await route.fulfill({
          json:
            request.externalIdProposicoesFiltroConcordancia.length === 2
              ? { ...resultado, deputados: [], total: 0 }
              : resultado,
        });
      });
      await storeRascunho(page, {
        ...rascunho,
        externalIdProposicoesFiltroConcordancia: [1, 2],
      });
      await page.goto("/matcher/resultado");
      await expect(
        page.getByRole("heading", {
          name: "Nenhum deputado votou como você em todas",
        }),
      ).toBeVisible();

      // Act
      await page
        .getByLabel("Deixar de exigir concordância em PL 2630/2020")
        .press("Space");

      // Assert
      await expect(painel(page)).toBeHidden();
      await expect
        .poll(() => requests.at(-1)?.externalIdProposicoesFiltroConcordancia)
        .toEqual([2]);
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();
    });

    test("amplia a busca vazia para o Brasil sem perder as marcações", async ({
      page,
    }) => {
      // Arrange
      const requests: Array<{
        escopo: string;
        externalIdProposicoesFiltroConcordancia: number[];
      }> = [];
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({
          json: { ...resultado, deputados: [], total: 0 },
        });
      });
      await storeRascunho(page, {
        ...rascunho,
        externalIdProposicoesFiltroConcordancia: [1, 2],
      });
      await page.goto("/matcher/resultado");
      await expect(
        page.getByRole("heading", {
          name: "Nenhum deputado votou como você em todas",
        }),
      ).toBeVisible();

      // Act
      await page
        .getByRole("button", { name: "Ampliar busca para o Brasil" })
        .click();

      // Assert
      await expect
        .poll(() => requests.at(-1))
        .toMatchObject({
          escopo: "nacional",
          externalIdProposicoesFiltroConcordancia: [1, 2],
        });
      await expect(page).toHaveURL("/matcher/resultado?escopo=nacional");
    });

    test("mantém o diagnóstico por escopo quando o filtro está inativo", async ({
      page,
    }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({
          json: { ...resultado, deputados: [], total: 0 },
        });
      });
      await storeRascunho(page);

      // Act
      await page.goto("/matcher/resultado");

      // Assert
      await expect(
        page.getByRole("heading", { name: "Nenhum comparável neste estado" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Nenhum deputado votou como você em todas",
        }),
      ).toHaveCount(0);
    });
  });

  test.describe("persistência das marcações", () => {
    test("preserva as propostas marcadas ao recarregar o resultado", async ({
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

    test("preserva as propostas marcadas ao abrir o detalhe e voltar", async ({
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
      await abrirFiltros(page).click();
      await expect(concordancia(page, "PL 2630/2020")).toBeChecked();
    });

    test("preserva as propostas marcadas ao ampliar o escopo", async ({
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
  });

  test.describe("contexto do painel", () => {
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
      await abrirFiltros(page).click();

      // Assert
      await expect(
        painel(page).getByText("PL 2630/2020", { exact: true }),
      ).toBeVisible();
      await expect(
        painel(page).getByText("Estabelece regras para plataformas digitais."),
      ).toBeVisible();
      await expect(
        painel(page).getByText("Deveria ser aprovada", { exact: true }),
      ).toHaveCount(2);
      await expect(
        painel(page).getByText("Não deveria ser aprovada", { exact: true }),
      ).toBeVisible();
      await expect(painel(page).getByText("PL 4/2025")).toHaveCount(0);
      expect(matcherRequests).toBe(requestsBeforeOpening);
    });

    test("explicita o recorte aplicado acima da lista", async ({ page }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();

      // Act
      await abrirFiltros(page).click();
      await concordancia(page, "PL 2630/2020").press("Space");
      await aplicar(page).click();

      // Assert
      await expect(
        page.getByRole("heading", {
          name: "Deputados que votaram com você nas propostas marcadas",
        }),
      ).toBeVisible();

      // Act
      await page
        .getByRole("button", {
          name: "Remover filtro Concordância: 1 proposta",
        })
        .click();

      // Assert
      await expect(
        page.getByRole("heading", {
          name: "Deputados que votaram com você nas propostas marcadas",
        }),
      ).toHaveCount(0);
    });
  });

  test.describe("adaptação à viewport", () => {
    test("usa a apresentação da viewport quando falta altura para selecionar filtros", async ({
      page,
    }) => {
      // Arrange
      await page.setViewportSize({ width: 1267, height: 676 });
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();

      // Act
      await abrirFiltros(page).click();

      // Assert
      await expect(painel(page)).toHaveAttribute("aria-modal", "true");
    });
  });
});
