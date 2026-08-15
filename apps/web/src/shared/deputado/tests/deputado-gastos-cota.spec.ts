import type {
  DeputadoCeapLoadedResponse,
  DeputadoCeapResponse,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoGastosCotaSection } from "../deputado-gastos-cota";

function loadedResponse(
  overrides: Partial<DeputadoCeapLoadedResponse> = {},
): DeputadoCeapLoadedResponse {
  return {
    year: 2024,
    availableYears: [2024, 2023],
    status: "ok",
    sigepaDataStatus: "completo",
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
    it("aproxima do gráfico o total e a mediana da UF, com cobertura", () => {
      // Arrange
      const response = loadedResponse();

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Gastos anuais da cota parlamentar");
      expect(html).toContain("R$ 427.123,45");
      expect(html).toContain("Mediana em SP");
      expect(html).toContain("R$ 398.000,00");
      expect(html).toContain("7% acima da mediana");
      expect(html).toContain(
        "Comparação com 63 deputados de SP em exercício durante todo o ano",
      );
      expect(html).toContain(
        'aria-label="Comparação visual entre o total utilizado e a mediana em SP"',
      );
      expect(html).toContain("Dados disponíveis: janeiro a outubro de 2024");
      expect(html).toContain("outubro de 2024");
      expect(html).not.toContain("Fonte: Câmara dos Deputados");
      expect(html).not.toContain("canvas");
    });

    it("apresenta discretamente a limitação do SIGEPA sem deixar de comparar a mediana", () => {
      // Arrange
      const response = loadedResponse({
        year: 2025,
        sigepaDataStatus: "incompleto",
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Nota sobre os dados:");
      expect(html).toContain(
        "passagens emitidas pelo SIGEPA não constam nesta fonte a partir de agosto de 2025",
      );
      expect(html).toContain(
        "O total pode estar abaixo do informado pela Câmara",
      );
      expect(html).toContain("Ver dados na Câmara");
      expect(html).toContain("Total registrado em 2025");
      expect(html).toContain("Mediana em SP");
      expect(html).not.toContain("bg-warning-soft");
      expect(html).not.toContain('role="alert"');
    });

    it("deixa de notar as passagens ausentes quando o ano da janela foi reposto", () => {
      // Arrange
      const response = loadedResponse({
        year: 2025,
        sigepaDataStatus: "completo",
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).not.toContain("Nota sobre os dados:");
      expect(html).not.toContain(
        "passagens emitidas pelo SIGEPA não constam nesta fonte a partir de agosto de 2025",
      );
      expect(html).toContain("Total utilizado em 2025");
    });

    it("sem exercício anual completo, não mostra card de total nem mediana redundante", () => {
      // Arrange
      const response = loadedResponse({
        year: 2025,
        sigepaDataStatus: "incompleto",
        medianaUf: null,
        exercicioAnoCompleto: false,
        periodosExercicio: [{ startDate: "2025-08-01", endDate: "2025-12-31" }],
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Total registrado em 2025: R$ 427.123,45.");
      expect(html).not.toContain("Dados disponíveis:");
      expect(html).not.toContain("Mediana em");
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
        'aria-label="Gráfico de barras horizontais da distribuição anual em 2024"',
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
      expect(html).toContain("Mediana em RR");
      expect(html).toContain("R$ 410.000,00");
      expect(html).toContain(
        "Comparação com 4 deputados de RR em exercício durante todo o ano",
      );
    });

    it("resume quanto o total ficou abaixo da mediana", () => {
      // Arrange
      const response = loadedResponse({
        totalAmountUsedCents: 4_733_534,
        medianaUf: { amountUsedCents: 22_739_011, deputadoCount: 64 },
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("79% abaixo da mediana");
      expect(html).toContain("R$ 47.335,34");
      expect(html).toContain("R$ 227.390,11");
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
      expect(html).not.toContain("Distribuição anual por categoria");
      expect(html).toContain("Total utilizado em 2024: R$ 3.543,00.");
      expect(html).toContain(
        'aria-label="Alternativa textual da distribuição anual"',
      );
      expect(html).toContain("Categoria 1");
      expect(html).toContain("R$ 900,00");
      expect(html).not.toContain('aria-label="Ver detalhes de Categoria 1"');
      expect(html).not.toContain('aria-pressed="false"');
      expect(html).not.toContain('aria-live="polite"');
      expect(html).not.toContain("Selecione uma categoria para ver detalhes");
      const alternativaTextual = html.slice(
        html.indexOf('aria-label="Alternativa textual da distribuição anual"'),
      );
      expect(alternativaTextual.indexOf("Categoria 1")).toBeLessThan(
        alternativaTextual.indexOf("Outras despesas"),
      );
      expect(alternativaTextual).toContain(
        "Ver composição de Outras despesas (2 categorias)",
      );
      const composicaoSummaryStart = alternativaTextual.indexOf("<summary");
      const composicaoSummaryTag = alternativaTextual.slice(
        composicaoSummaryStart,
        alternativaTextual.indexOf(">", composicaoSummaryStart),
      );
      expect(composicaoSummaryTag).toContain("text-muted");
      expect(composicaoSummaryTag).not.toContain("text-info");
      expect(composicaoSummaryTag).not.toContain("underline");
      expect(html).toContain(
        "sm:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] sm:gap-8 sm:items-start",
      );
      expect(alternativaTextual).toContain("Categoria 6");
      expect(alternativaTextual).toContain("R$ 40,00");
      expect(alternativaTextual).toContain("1,1%");
      expect(alternativaTextual).toContain("Categoria 7");
    });

    it("não apresenta exploração mensal", () => {
      // Arrange
      const response = loadedResponse({
        totalAmountUsedCents: 90_000,
        categories: [
          {
            externalNumSubCota: 3,
            description: "Combustíveis",
            amountUsedCents: 90_000,
          },
        ],
        months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          totalAmountUsedCents: index === 0 ? 90_000 : 0,
          categories:
            index === 0
              ? [{ externalNumSubCota: 3, amountUsedCents: 90_000 }]
              : [],
        })),
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).not.toContain("Gastos por mês");
      expect(html).not.toContain("Explorar valores");
      expect(html).not.toContain("Alternativa textual dos gastos mensais");
    });

    it("representa em barras o par real com Outras despesas negativas", () => {
      // Arrange
      const response = loadedResponse({
        year: 2023,
        totalAmountUsedCents: 3_028_113,
        categories: [
          {
            externalNumSubCota: 119,
            description: "LOCAÇÃO OU FRETAMENTO DE AERONAVES",
            amountUsedCents: 2_079_030,
          },
          {
            externalNumSubCota: 120,
            description: "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
            amountUsedCents: 1_178_240,
          },
          {
            externalNumSubCota: 9,
            description: "PASSAGEM AÉREA - REEMBOLSO",
            amountUsedCents: 929_563,
          },
          {
            externalNumSubCota: 5,
            description: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.",
            amountUsedCents: 170_000,
          },
          {
            externalNumSubCota: 10,
            description: "TELEFONIA",
            amountUsedCents: 178,
          },
          {
            externalNumSubCota: 998,
            description: "PASSAGEM AÉREA - SIGEPA",
            amountUsedCents: -1_328_898,
          },
        ],
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain(
        'aria-label="Gráfico de barras horizontais da distribuição anual em 2023"',
      );
      expect(html).not.toContain(
        'aria-labelledby="gasto-cota-distribuicao-title"',
      );
      expect(html).toContain("-R$ 13.288,98");
      expect(html).toContain("R$ 30.281,13");
      expect(html).not.toContain(
        "Este ano inclui ajustes que reduzem ou anulam valores de algumas categorias",
      );
      expect(html).toContain("LOCAÇÃO OU FRETAMENTO DE AERONAVES");
      expect(html).not.toContain(
        'aria-label="Ver detalhes de LOCAÇÃO OU FRETAMENTO DE AERONAVES"',
      );
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain(
        "Passe o mouse, toque ou use o teclado para ver uma categoria",
      );
      const alternativaTextual = html.slice(
        html.indexOf('aria-label="Alternativa textual da distribuição anual"'),
        html.indexOf("</ol>"),
      );
      expect(
        alternativaTextual.indexOf("LOCAÇÃO OU FRETAMENTO DE AERONAVES"),
      ).toBeLessThan(
        alternativaTextual.indexOf(
          "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
        ),
      );
      expect(
        alternativaTextual.indexOf(
          "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
        ),
      ).toBeLessThan(alternativaTextual.indexOf("Outras despesas"));
      expect(alternativaTextual).toContain("background-color:#009988");
      expect(alternativaTextual).toContain("background-color:#737373");
      expect(html).not.toContain("Total da distribuição");
      expect(html).not.toContain(
        "A distribuição por categoria não pode ser exibida",
      );
    });

    it("não calcula participação quando compensações zeram o total anual", () => {
      // Arrange
      const response = loadedResponse({
        totalAmountUsedCents: 0,
        categories: [
          ...Array.from({ length: 5 }, (_, index) => ({
            externalNumSubCota: index + 1,
            description: `Categoria ${index + 1}`,
            amountUsedCents: 1_000,
          })),
          {
            externalNumSubCota: 6,
            description: "Compensação",
            amountUsedCents: -5_000,
          },
        ],
      });

      // Act
      const html = render(response);

      // Assert
      expect(html).toContain("Participação indisponível");
      expect(html).not.toContain("∞");
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
      expect(html).toContain(
        "Sem comparação com deputados que exerceram o ano inteiro",
      );
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
        "Não há registros de gastos da cota para este deputado neste ano",
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
      expect(html).toContain("Gastos anuais da cota parlamentar");
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
      expect(html).not.toContain("h-5 w-56");
      expect(html).not.toContain("h-20");
    });

    it("não reserva espaço para a distribuição mensal removida", () => {
      // Arrange / Act
      const html = renderState({ status: "loading" });

      // Assert
      expect(html).not.toContain("Carregando distribuição mensal dos gastos");
      expect(html).not.toContain("h-72");
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
