import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { buildComparativoDeputadosGrid } from "../comparativo-deputados-grid";

function deputado(
  externalIdDeputado: number,
  overrides: Partial<ComparativoDeputado> = {},
): ComparativoDeputado {
  return {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: `Deputado ${externalIdDeputado} da Silva`,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    emAtividade: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: `Deputado ${externalIdDeputado}`,
      siglaPartido: "PT",
      siglaUf: "MG",
      urlFoto: null,
    },
    legislaturaInicialPeriodo: null,
    legislaturaFinalPeriodo: null,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 92,
      presencas: 92,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 8,
    },
    proposicoesAssinadas: {
      year: 2025,
      disponivel: true,
      total: 12,
      totalPrimeiroSignatario: 3,
      coveredThroughDate: "2025-08-14",
    },
    orgaos: { year: 2025, items: [], total: 0 },
    cota: {
      status: "comparavel",
      percentualSobreMedianaUf: 112,
      medianaUf: { siglaUf: "MG", deputadoCount: 53 },
    },
    ...overrides,
  };
}

function response(
  items: readonly ComparativoDeputado[],
  year: number | null = 2025,
): ComparativoDeputadosResponse {
  return {
    year,
    comparableYears: year === null ? [] : [year],
    items: [...items],
  };
}

function rowById(
  grid: ReturnType<typeof buildComparativoDeputadosGrid>,
  id: string,
) {
  const row = grid.rows.find((item) => item.id === id);
  if (row === undefined) throw new Error(`linha ${id} ausente`);
  return row;
}

describe("grade do comparativo de deputados", () => {
  describe("quando os deputados são comparados", () => {
    it("mantém a ordem dos deputados nas colunas", () => {
      // Arrange
      const data = response([deputado(2), deputado(1)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(grid.columns.map((column) => column.externalIdDeputado)).toEqual([
        2, 1,
      ]);
    });

    it("leva cada coluna ao perfil do deputado", () => {
      // Arrange
      const data = response([deputado(2), deputado(1)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(grid.columns[0].perfilHref).toBe("/deputados/2");
    });

    it("nomeia o ano aplicado nas métricas anuais", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "proposicoes-assinadas").label).toBe(
        "Proposições assinadas em 2025",
      );
    });

    it("avisa que a presença usa toda a base, não o ano", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "presenca").hint).toContain("não apenas o ano");
    });
  });

  describe("quando a cota tem comparação", () => {
    it("publica a posição frente à mediana, não o valor gasto", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toEqual({
        externalIdDeputado: 1,
        value: "12% acima da mediana",
        detail:
          "Comparação com 53 deputados de MG em exercício durante todo o ano",
        lacuna: false,
      });
    });

    it("nomeia o empate com a mediana", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: {
            status: "comparavel",
            percentualSobreMedianaUf: 100,
            medianaUf: { siglaUf: "MG", deputadoCount: 53 },
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].value).toBe(
        "Mesmo valor da mediana",
      );
    });

    it("nomeia a posição abaixo da mediana", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: {
            status: "comparavel",
            percentualSobreMedianaUf: 70.4,
            medianaUf: { siglaUf: "MG", deputadoCount: 53 },
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].value).toBe(
        "30% abaixo da mediana",
      );
    });
  });

  describe("quando a cota não tem comparação", () => {
    it("declara o motivo em vez de um número", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: { status: "sem-comparacao", motivo: "exercicio-parcial" },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toMatchObject({
        value: "Exercício parcial no ano",
        lacuna: true,
      });
    });
  });

  describe("quando os órgãos do ano existem", () => {
    it("resume os primeiros nomes ao lado do total", () => {
      // Arrange
      const orgao = (externalIdOrgao: number, siglaOrgao: string) => ({
        externalIdOrgao,
        siglaOrgao,
        nome: `Comissão ${siglaOrgao}`,
        titulo: "Titular",
        dataInicio: "2025-03-01",
        dataFim: null,
      });
      const data = response([
        deputado(1, {
          orgaos: {
            year: 2025,
            items: [orgao(1, "CCJC"), orgao(2, "CFT"), orgao(3, "CE")],
            total: 3,
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "orgaos").cells[0]).toMatchObject({
        value: "3",
        detail: "CCJC, CFT e mais 1",
      });
    });
  });

  describe("quando não há ano comparável", () => {
    it("marca as métricas anuais como lacuna e mantém a presença", () => {
      // Arrange
      const semAno = {
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      };
      const data = response([deputado(1, semAno), deputado(2, semAno)], null);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect({
        proposicoes: rowById(grid, "proposicoes-assinadas").cells[0],
        presenca: rowById(grid, "presenca").cells[0].value,
        label: rowById(grid, "cota").label,
      }).toEqual({
        proposicoes: {
          externalIdDeputado: 1,
          value: "Sem ano comparável",
          detail: null,
          lacuna: true,
        },
        presenca: "92%",
        label: "Cota parlamentar",
      });
    });
  });

  describe("quando a presença não está disponível", () => {
    it("declara a lacuna em vez de zero", () => {
      // Arrange
      const data = response([
        deputado(1, {
          resumoPresencaDisponivel: false,
          resumoPresenca: null,
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "presenca").cells[0]).toMatchObject({
        value: "Sem dados de presença",
        lacuna: true,
      });
    });
  });
});
