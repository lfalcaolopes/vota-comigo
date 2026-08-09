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
  externalIdProposicoesFiltroConcordancia: [] as number[],
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
  test.describe("acessibilidade do painel", () => {
    test("mantém o foco no filtro depois de limpar as marcações por teclado", async ({
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
      const trigger = page.getByRole("button", {
        name: "Votou comigo, 1 proposição marcada",
      });
      await trigger.focus();
      await page.keyboard.press("Tab");
      const clear = page.getByRole("button", { name: "Limpar filtro" });
      await expect(clear).toBeFocused();

      // Act
      await page.keyboard.press("Enter");

      // Assert
      const updatedTrigger = page.getByRole("button", {
        name: "Votou comigo, 0 proposições marcadas",
      });
      await expect(updatedTrigger).toBeFocused();
    });

    test("anuncia o total do recorte depois de marcar uma proposição", async ({
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
      await page
        .getByRole("button", {
          name: "Votou comigo, 0 proposições marcadas",
        })
        .click();

      // Act
      await page
        .getByLabel("Exigir concordância em PL 2630/2020", { exact: true })
        .press("Space");

      // Assert
      await expect(
        page.locator('[role="status"]').filter({
          hasText: "Resultado atualizado: 2 deputados no resultado.",
        }),
      ).toBeAttached();
    });

    test("anuncia o resultado vazio sem descartar o foco da proposição marcada", async ({
      page,
    }) => {
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
      await page
        .getByRole("button", {
          name: "Votou comigo, 0 proposições marcadas",
        })
        .click();
      const proposicao = page.getByLabel(
        "Exigir concordância em PL 2630/2020",
        { exact: true },
      );

      // Act
      await proposicao.press("Space");

      // Assert
      await expect(
        page.locator('[role="status"]').filter({
          hasText:
            "Resultado atualizado: nenhum deputado votou com você em todas as proposições marcadas.",
        }),
      ).toBeAttached();
      await expect(proposicao).toBeFocused();
    });

    test("comunica o estado e a quantidade de proposições marcadas no gatilho", async ({
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
      const trigger = page.getByRole("button", {
        name: "Votou comigo, 1 proposição marcada",
      });

      // Act
      await trigger.click();

      // Assert
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("devolve o foco ao gatilho ao fechar o painel", async ({ page }) => {
      // Arrange
      await page.route("http://localhost:3001/matcher?**", async (route) => {
        await route.fulfill({ json: resultado });
      });
      await storeRascunho(page);
      await page.goto("/matcher/resultado");
      await expect(page.getByText("Deputada Exemplo")).toBeVisible();
      const trigger = page.getByText("Votou comigo", { exact: true });
      await trigger.click();

      // Act
      await page.getByRole("button", { name: "Fechar filtro" }).click();

      // Assert
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });
  });

  test.describe("quando o filtro deixa o resultado vazio", () => {
    test("explica quando as proposições marcadas eliminam todos os deputados", async ({
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
        page.getByText(
          "O filtro exige concordância nas 2 proposições marcadas.",
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Nenhum comparável neste estado" }),
      ).toHaveCount(0);
    });

    test("permite afrouxar o filtro sem recomeçar o matcher", async ({
      page,
    }) => {
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
  });

  test.describe("contexto e recorte do resultado", () => {
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
      await expect(
        page.getByText("PL 2630/2020", { exact: true }),
      ).toBeVisible();
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
      await page
        .getByLabel("Exigir concordância em PL 2630/2020")
        .press("Space");

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
      const trigger = page.getByRole("button", {
        name: "Votou comigo, 1 proposição marcada",
      });
      if ((await trigger.getAttribute("aria-expanded")) === "true") {
        await trigger.click();
      }
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(
        page.getByText("Votou comigo (1)", { exact: true }),
      ).toBeVisible();

      // Act
      await page.getByRole("button", { name: "Limpar filtro" }).click();

      // Assert
      await expect
        .poll(() => requests.at(-1)?.externalIdProposicoesFiltroConcordancia)
        .toEqual([]);
      await expect(
        page.getByText("Votou comigo", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Deputados que votaram com você nas proposições marcadas",
        }),
      ).toHaveCount(0);
    });
  });
});
