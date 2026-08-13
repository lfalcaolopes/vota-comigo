import type { DeputadoCeapResponse } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoGastosCotaSection } from "../deputado-gastos-cota";

function loadedResponse(
  overrides: Partial<Extract<DeputadoCeapResponse, { status: "ok" }>> = {},
): Extract<DeputadoCeapResponse, { status: "ok" }> {
  return {
    year: 2024,
    availableYears: [2024, 2023],
    status: "ok",
    coveredThroughMonth: 10,
    totalAmountUsedCents: 42_712_345,
    siglaUf: "SP",
    exercicioAnoCompleto: true,
    periodosExercicio: [{ startDate: "2024-01-01", endDate: "2024-12-31" }],
    medianaUf: { amountUsedCents: 39_800_000, deputadoCount: 63 },
    categories: [],
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      totalAmountUsedCents: index < 10 ? 0 : null,
      categories: [],
    })),
    ...overrides,
  };
}

function render(response: DeputadoCeapResponse): string {
  return renderToStaticMarkup(
    createElement(DeputadoGastosCotaSection, {
      state: { status: "success", response },
    }),
  );
}

function renderState(
  state: Parameters<typeof DeputadoGastosCotaSection>[0]["state"],
): string {
  return renderToStaticMarkup(
    createElement(DeputadoGastosCotaSection, { state }),
  );
}

describe("seção de gastos da cota parlamentar", () => {
  describe("quando o deputado exerceu o ano inteiro e tem gastos", () => {
    it("apresenta o total com a escala da UF, cobertura e fonte oficial", () => {
      // Arrange
      const response = loadedResponse();

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Gastos da cota parlamentar");
      expect(html).toContain("R$ 427.123,45");
      expect(html).toContain("Mediana de SP: R$ 398.000,00");
      expect(html).toContain("63 deputados");
      expect(html).toContain("O teto da cota varia por estado");
      expect(html).toContain("outubro de 2024");
      expect(html).toContain("Câmara dos Deputados");
      expect(html).not.toContain("canvas");
    });

    it("preserva compensações negativas em vez de apresentá-las como despesa positiva", () => {
      // Arrange
      const response = loadedResponse({ totalAmountUsedCents: -12_345 });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("-R$ 123,45");
      expect(html).not.toContain(">R$ 123,45<");
      expect(html).toContain(
        "A distribuição por categoria não pode ser exibida para este ano",
      );
      expect(html).not.toContain("Total da distribuição");
    });

    it("mantém a mediana de uma bancada pequena junto do tamanho da amostra", () => {
      // Arrange
      const response = loadedResponse({
        siglaUf: "RR",
        medianaUf: { amountUsedCents: 41_000_000, deputadoCount: 4 },
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Mediana de RR: R$ 410.000,00");
      expect(html).toContain("4 deputados");
    });

    it("apresenta a distribuição anual e sua alternativa textual na mesma ordem", () => {
      // Arrange
      const response = loadedResponse({
        totalAmountUsedCents: 354_300,
        categories: [
          {
            externalNumSubCota: 1,
            description: "Categoria 1",
            amountUsedCents: 90_000,
          },
          {
            externalNumSubCota: 2,
            description: "Categoria 2",
            amountUsedCents: 80_000,
          },
          {
            externalNumSubCota: 3,
            description: "Categoria 3",
            amountUsedCents: 70_000,
          },
          {
            externalNumSubCota: 4,
            description: "Categoria 4",
            amountUsedCents: 60_000,
          },
          {
            externalNumSubCota: 5,
            description: "Categoria 5",
            amountUsedCents: 50_000,
          },
          {
            externalNumSubCota: 6,
            description: "Categoria 6",
            amountUsedCents: 4_000,
          },
          {
            externalNumSubCota: 7,
            description: "Categoria 7",
            amountUsedCents: 300,
          },
        ],
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Distribuição anual por categoria");
      expect(html).toContain(
        'aria-label="Total da distribuição: R$ 3.543,00 em 2024"',
      );
      expect(html).toContain(
        'aria-label="Alternativa textual da distribuição anual"',
      );
      expect(html).toContain('aria-label="Ver detalhes de Categoria 1"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain(
        "Passe o mouse, toque ou use o teclado para ver uma categoria",
      );
      const alternativaTextual = html.slice(
        html.indexOf('aria-label="Alternativa textual da distribuição anual"'),
      );
      expect(alternativaTextual.indexOf("Categoria 1")).toBeLessThan(
        alternativaTextual.indexOf("Outras despesas"),
      );
      expect(alternativaTextual).not.toContain("Categoria 6");
      expect(alternativaTextual).not.toContain("Categoria 7");
    });

    it("não representa um grupo negativo como fatia positiva", () => {
      // Arrange
      const response = loadedResponse({
        totalAmountUsedCents: 89_000,
        categories: [
          {
            externalNumSubCota: 1,
            description: "Combustíveis",
            amountUsedCents: 90_000,
          },
          {
            externalNumSubCota: 10,
            description: "Passagens",
            amountUsedCents: -1_000,
          },
        ],
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("R$ 890,00");
      expect(html).toContain(
        "A distribuição por categoria não pode ser exibida para este ano",
      );
      expect(html).not.toContain("Total da distribuição");
    });
  });

  describe("quando o deputado exerceu apenas parte do ano", () => {
    it("mantém o total real e substitui a comparação pelo período exercido", () => {
      // Arrange
      const response = loadedResponse({
        totalAmountUsedCents: 15_000_000,
        exercicioAnoCompleto: false,
        periodosExercicio: [{ startDate: "2024-08-15", endDate: "2024-12-31" }],
        medianaUf: null,
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("R$ 150.000,00");
      expect(html).toContain("15/08/2024 a 31/12/2024");
      expect(html).toContain("não é comparado com quem exerceu o ano inteiro");
      expect(html).not.toContain("Mediana");
      expect(html).not.toContain("projetado");
      expect(html).not.toContain("anualizado");
    });
  });

  describe("quando o ano foi carregado e o deputado não tem gastos", () => {
    it("informa a ausência de registros sem sugerir ausência de dados", () => {
      // Arrange
      const response: DeputadoCeapResponse = {
        ...loadedResponse(),
        status: "sem-gastos",
        totalAmountUsedCents: 0,
        siglaUf: null,
        medianaUf: null,
      };

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain(
        "O deputado não registrou gastos da cota neste ano",
      );
      expect(html).toContain("outubro de 2024");
      expect(html).not.toContain("Este ano ainda não foi carregado");
      expect(html).not.toContain("R$ 0,00");
    });
  });

  describe("quando o ano ainda não foi carregado", () => {
    it("informa a ausência do dado sem afirmar ausência de gasto", () => {
      // Arrange
      const response: DeputadoCeapResponse = {
        year: 2022,
        availableYears: [2024, 2023],
        status: "ano-nao-carregado",
      };

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Este ano ainda não foi carregado");
      expect(html).toContain(
        "Os gastos da cota de 2022 ainda não estão disponíveis no produto",
      );
      expect(html).toContain("Fonte: Câmara dos Deputados");
      expect(html).not.toContain("não registrou gastos");
      expect(html).not.toContain("Dados da Câmara atualizados até");
      expect(html).not.toContain("R$");
    });
  });

  describe("enquanto os gastos do ano são consultados", () => {
    it("mantém um esqueleto restrito à seção", () => {
      // Arrange / Act
      const html = renderState({ status: "loading" });

      // Assert
      expect(html).toContain("Gastos da cota parlamentar");
      expect(html).toContain("Carregando conteúdo");
      expect(html).not.toContain("Não foi possível carregar");
    });

    it("reserva as dimensões finais da distribuição anual", () => {
      // Arrange / Act
      const html = renderState({ status: "loading" });

      // Assert
      expect(html).toContain(
        'aria-label="Carregando distribuição anual dos gastos"',
      );
      expect(html).toContain("aspect-square");
      expect(html).toContain("max-w-80");
    });
  });

  describe("quando a consulta dos gastos falha", () => {
    it("informa a falha local sem transformar o perfil inteiro em erro", () => {
      // Arrange / Act
      const html = renderState({ status: "error" });

      // Assert
      expect(html).toContain("Não foi possível carregar os gastos da cota");
      expect(html).toContain("O restante do perfil continua disponível");
      expect(html).not.toContain("Carregando conteúdo");
    });
  });
});
