import type {
  ComparativoCotaAno,
  ComparativoDeputado,
  ComparativoDeputadosResponse,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildComparativoDeputadosGrid,
  toComparativoAviso,
} from "../comparativo-deputados-grid";

const JANELA_57 = {
  status: "disponivel" as const,
  legislatura: 57,
  dataInicio: "2023-02-01",
  dataFim: "2025-04-10T00:00:00.000Z",
  encerrada: true,
  diasEmExercicioDisponivel: true,
  diasEmExercicio: 800,
  coberturaAte: "2025-12-31",
  divisorAnosEfetivos: 3,
};

const JANELA_56 = { ...JANELA_57, legislatura: 56, dataInicio: "2019-02-01" };

const JANELA_INDISPONIVEL = {
  status: "indisponivel" as const,
  motivo: "legislatura-anterior-a-cobertura" as const,
  ultimaLegislatura: 54,
};

function cotaAno(
  year: number,
  percentualSobreMedianaUf: number | null,
  overrides: Partial<ComparativoCotaAno> = {},
): ComparativoCotaAno {
  return {
    year,
    naComparacao: percentualSobreMedianaUf !== null,
    percentualSobreMedianaUf,
    diasEmExercicio: 350,
    diasNoAno: 350,
    medianaUfDeputadoCount: percentualSobreMedianaUf === null ? null : 53,
    dadoIncompleto: false,
    ...overrides,
  };
}

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
      percentualSobreMedianaUf: 112,
      siglaUf: "MG",
      anos: [cotaAno(2023, 110), cotaAno(2024, 114)],
      anosNaComparacao: 2,
      diasEmExercicio: 700,
      diasNaComparacao: 700,
    },
    ...overrides,
  };
}

function response(
  items: readonly ComparativoDeputado[],
  janelasCoincidem = true,
): ComparativoDeputadosResponse {
  return { janelasCoincidem, items: [...items] };
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

    it("rotula as métricas da janela sem sufixo de ano", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "proposicoes-assinadas").label).toBe(
        "Proposições assinadas",
      );
    });

    it("avisa que a presença usa a legislatura da coluna", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "presenca").hint).toContain(
        "legislatura mostrada na coluna",
      );
    });

    it("carrega a janela de cada deputado na coluna", () => {
      // Arrange
      const data = response([deputado(1)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(grid.columns[0].janela).toEqual(JANELA_57);
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
        detail: "700 de 700 dias em exercício · 2 anos comparados",
        breakdown: ["2023 · 110%", "2024 · 114%"],
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
            siglaUf: "MG",
            anos: [cotaAno(2023, 100)],
            anosNaComparacao: 1,
            diasEmExercicio: 350,
            diasNaComparacao: 350,
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
            siglaUf: "MG",
            anos: [cotaAno(2023, 70.4)],
            anosNaComparacao: 1,
            diasEmExercicio: 350,
            diasNaComparacao: 350,
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
          cota: {
            status: "sem-comparacao",
            motivo: "sem-mediana-na-janela",
            anos: [cotaAno(2023, null)],
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toMatchObject({
        value: "Sem mediana na janela",
        lacuna: true,
      });
    });

    it("mantém os anos visíveis mesmo sem posição agregada", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: {
            status: "sem-comparacao",
            motivo: "sem-gastos",
            anos: [
              cotaAno(2023, null, { diasEmExercicio: 0 }),
              cotaAno(2024, null),
            ],
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toMatchObject({
        value: "Sem gastos na janela",
        breakdown: ["2023 · sem exercício", "2024 · sem mediana"],
      });
    });

    it("marca na célula o ano com dado incompleto", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: {
            status: "comparavel",
            percentualSobreMedianaUf: 105,
            siglaUf: "MG",
            anos: [cotaAno(2026, 105, { dadoIncompleto: true })],
            anosNaComparacao: 1,
            diasEmExercicio: 350,
            diasNaComparacao: 350,
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].breakdown).toEqual([
        "2026 · 105% (dado incompleto)",
      ]);
    });
  });

  describe("quando os órgãos do período existem", () => {
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
        value: "1,0/ano",
        detail: "3 no total · CCJC, CFT e mais 1",
      });
    });

    it("chama a linha de órgãos distintos, não de vínculos", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "orgaos").label).toBe("Órgãos distintos");
    });
  });

  describe("quando as contagens absolutas são normalizadas por ano", () => {
    it("divide o total pelos anos efetivos e abre o detalhe com o total", () => {
      // Arrange
      const data = response([
        deputado(1, {
          proposicoesAssinadas: {
            disponivel: true,
            total: 340,
            totalPrimeiroSignatario: 41,
            coveredThroughDate: "2026-06-30",
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "proposicoes-assinadas").cells[0]).toMatchObject({
        value: "113/ano",
        detail: "340 no total · 41 como primeiro signatário",
      });
    });

    it("cai para o total absoluto quando não há ano efetivo na janela", () => {
      // Arrange
      const janelaSemCobertura = { ...JANELA_57, divisorAnosEfetivos: 0 };
      const data = response([
        deputado(1, { janela: janelaSemCobertura }),
        deputado(2, { janela: janelaSemCobertura }),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "proposicoes-assinadas").cells[0]).toMatchObject({
        value: "12",
        detail: "12 no total · 3 como primeiro signatário",
      });
    });

    it("declara os anos que faltam quando a janela tem ano descoberto", () => {
      // Arrange
      const data = response([
        deputado(1, {
          proposicoesAssinadas: {
            disponivel: false,
            motivo: "anos-descobertos",
            anosDescobertos: [2025, 2026],
          },
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "proposicoes-assinadas").cells[0]).toMatchObject({
        value: "Sem dados na janela",
        detail: "Anos não carregados: 2025 e 2026",
        lacuna: true,
      });
    });

    it("nomeia a janela sem nenhum órgão", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "orgaos").cells[0]).toMatchObject({
        value: "0",
        detail: "Nenhum órgão na janela",
      });
    });
  });

  describe("quando a janela do deputado está indisponível", () => {
    it("marca todas as métricas, inclusive a presença, como recusadas", () => {
      // Arrange
      const semJanela = {
        janela: JANELA_INDISPONIVEL,
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      };
      const data = response([deputado(1, semJanela), deputado(2, semJanela)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect({
        proposicoes: rowById(grid, "proposicoes-assinadas").cells[0],
        presenca: rowById(grid, "presenca").cells[0],
        label: rowById(grid, "cota").label,
      }).toEqual({
        proposicoes: {
          externalIdDeputado: 1,
          value: "Sem dados comparáveis",
          detail: "Última atuação na 54ª legislatura",
          breakdown: null,
          lacuna: true,
        },
        presenca: {
          externalIdDeputado: 1,
          value: "Sem dados comparáveis",
          detail: "Última atuação na 54ª legislatura",
          breakdown: null,
          lacuna: true,
        },
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

describe("aviso do topo do comparativo de deputados", () => {
  describe("quando não há divergência nem recusa", () => {
    it("não produz aviso", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const aviso = toComparativoAviso(data);

      // Assert
      expect(aviso).toBeNull();
    });
  });

  describe("quando as legislaturas divergem", () => {
    it("agrupa os nomes por legislatura", () => {
      // Arrange
      const data = response(
        [
          deputado(1, { nomePublico: "Erika Kokay", janela: JANELA_57 }),
          deputado(2, { nomePublico: "Kim Kataguiri", janela: JANELA_57 }),
          deputado(3, { nomePublico: "Fulano de Tal", janela: JANELA_56 }),
        ],
        false,
      );

      // Act
      const aviso = toComparativoAviso(data);

      // Assert
      expect(aviso).toEqual({
        tone: "warning",
        title: "Legislaturas diferentes",
        body: "Cada deputado aparece na última legislatura em que atuou: 57ª (Erika Kokay e Kim Kataguiri) e 56ª (Fulano de Tal). Os números de cada coluna são do período dela, não de um período comum.",
      });
    });
  });

  describe("quando um deputado está abaixo do piso da 55ª legislatura", () => {
    it("prioriza a recusa sobre o aviso de divergência", () => {
      // Arrange
      const data = response(
        [
          deputado(1, {
            nomePublico: "Fulano de Tal",
            janela: JANELA_INDISPONIVEL,
          }),
          deputado(2, { nomePublico: "Erika Kokay", janela: JANELA_57 }),
        ],
        false,
      );

      // Act
      const aviso = toComparativoAviso(data);

      // Assert
      expect(aviso).toEqual({
        tone: "neutral",
        title: "Um dos deputados está fora da base comparável",
        body: "Fulano de Tal atuou pela última vez na 54ª legislatura. O Vota Comigo cobre votações, cota parlamentar e mediana de gastos a partir de 2015, início da 55ª legislatura, então não há dados desse mandato para comparar.",
      });
    });

    it("mantém os demais comparáveis na copy quando sobram dois ou mais", () => {
      // Arrange
      const data = response([
        deputado(1, {
          nomePublico: "Fulano de Tal",
          janela: JANELA_INDISPONIVEL,
        }),
        deputado(2, { nomePublico: "Erika Kokay", janela: JANELA_57 }),
        deputado(3, { nomePublico: "Kim Kataguiri", janela: JANELA_57 }),
      ]);

      // Act
      const aviso = toComparativoAviso(data);

      // Assert
      expect(aviso?.body).toContain(
        "Os demais deputados continuam comparáveis.",
      );
    });
  });
});
