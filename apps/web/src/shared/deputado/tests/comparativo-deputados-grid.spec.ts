import type {
  ComparativoCota,
  ComparativoCotaAno,
  ComparativoDeputado,
  ComparativoDeputadosResponse,
} from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildComparativoDeputadosGrid,
  toComparativoAviso,
  toComparativoNotaCobertura,
} from "../comparativo-deputados-grid";
import { COTA_PARLAMENTAR_HELP } from "../gasto-cota-presentation";

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

const JANELA_EM_CURSO = {
  ...JANELA_57,
  dataFim: "2027-01-31",
  encerrada: false,
  coberturaAte: "2026-06-30",
};

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

function cotaComparavel(
  overrides: Partial<Extract<ComparativoCota, { status: "comparavel" }>> = {},
): ComparativoCota {
  return {
    status: "comparavel",
    percentualSobreMedianaUf: 112,
    gastoNaComparacaoCents: 110_000_000,
    medianaNaComparacaoCents: 98_214_286,
    tetoNaComparacaoCents: 140_000_000,
    siglaUf: "MG",
    anos: [cotaAno(2023, 110), cotaAno(2024, 114)],
    anosNaComparacao: 2,
    diasEmExercicio: 700,
    diasNaComparacao: 700,
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
    cota: cotaComparavel(),
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

    it("explica o que é a cota parlamentar apenas na linha da cota", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").help).toBe(COTA_PARLAMENTAR_HELP);
      expect(rowById(grid, "presenca").help).toBeNull();
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
    it("publica o gasto por ano e as duas réguas da comparação", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toEqual({
        externalIdDeputado: 1,
        value: "R$ 550 mil/ano",
        detail: "79% do teto · 12% acima da mediana do MG",
        note: "R$ 1,1 mi de R$ 1,4 mi em 2 anos",
        barra: {
          gastoCents: 110_000_000,
          medianaCents: 98_214_286,
          tetoCents: 140_000_000,
        },
        link: {
          href: "/deputados/1?year=2024#gastos",
          label: "Ver mais detalhes no perfil",
        },
        lacuna: false,
      });
    });

    it("cai para o total absoluto quando a UF não tem teto publicado", () => {
      // Arrange
      const data = response([
        deputado(1, { cota: cotaComparavel({ tetoNaComparacaoCents: null }) }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toMatchObject({
        detail: "12% acima da mediana do MG",
        note: "R$ 1,1 mi no total em 2 anos",
        barra: {
          gastoCents: 110_000_000,
          medianaCents: 98_214_286,
          tetoCents: null,
        },
      });
    });

    it("concorda em número com a janela de um ano só", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: cotaComparavel({
            gastoNaComparacaoCents: 40_000_000,
            tetoNaComparacaoCents: 50_000_000,
            anos: [cotaAno(2023, 100)],
            anosNaComparacao: 1,
          }),
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0]).toMatchObject({
        detail: "80% do teto · 12% acima da mediana do MG",
        note: "R$ 400 mil de R$ 500 mil em 1 ano",
      });
    });

    it("não trata como consumo o total negativo de estornos", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: cotaComparavel({ gastoNaComparacaoCents: -1_000 }),
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].detail).toContain(
        "Nenhum valor consumido do teto",
      );
    });

    it("nomeia o empate com a mediana", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: cotaComparavel({
            percentualSobreMedianaUf: 100,
            gastoNaComparacaoCents: 40_000_000,
            medianaNaComparacaoCents: 40_000_000,
            anos: [cotaAno(2023, 100)],
            anosNaComparacao: 1,
            diasEmExercicio: 350,
            diasNaComparacao: 350,
          }),
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].detail).toContain(
        "Mesmo valor da mediana do MG",
      );
    });

    it("nomeia a posição abaixo da mediana", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: cotaComparavel({
            percentualSobreMedianaUf: 70.4,
            gastoNaComparacaoCents: 28_000_000,
            medianaNaComparacaoCents: 39_772_727,
            anos: [cotaAno(2023, 70.4)],
            anosNaComparacao: 1,
            diasEmExercicio: 350,
            diasNaComparacao: 350,
          }),
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].detail).toContain(
        "30% abaixo da mediana do MG",
      );
    });

    it("aponta o link para o último ano da janela", () => {
      // Arrange
      const data = response([
        deputado(1, {
          cota: cotaComparavel({
            percentualSobreMedianaUf: 105,
            gastoNaComparacaoCents: 42_000_000,
            medianaNaComparacaoCents: 40_000_000,
            anos: [cotaAno(2026, 105, { dadoIncompleto: true })],
            anosNaComparacao: 1,
            diasEmExercicio: 350,
            diasNaComparacao: 350,
          }),
        }),
        deputado(2),
      ]);

      // Act
      const grid = buildComparativoDeputadosGrid(data);

      // Assert
      expect(rowById(grid, "cota").cells[0].link?.href).toBe(
        "/deputados/1?year=2026#gastos",
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

    it("leva ao perfil mesmo sem posição agregada", () => {
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
        link: {
          href: "/deputados/1?year=2024#gastos",
          label: "Ver mais detalhes no perfil",
        },
      });
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
        detail: "340 no total · 41 como autor principal",
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
        detail: "12 no total · 3 como autor principal",
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
        resumoPresencaDisponivel: false,
        resumoPresenca: null,
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
          note: null,
          barra: null,
          link: null,
          lacuna: true,
        },
        presenca: {
          externalIdDeputado: 1,
          value: "Sem dados comparáveis",
          detail: "Última atuação na 54ª legislatura",
          note: null,
          barra: null,
          link: null,
          lacuna: true,
        },
        label: "Gasto da cota parlamentar",
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
            resumoPresencaDisponivel: false,
            resumoPresenca: null,
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

describe("nota de cobertura do comparativo de deputados", () => {
  describe("quando todas as janelas estão totalmente cobertas", () => {
    it("não produz nota", () => {
      // Arrange
      const data = response([deputado(1), deputado(2)]);

      // Act
      const nota = toComparativoNotaCobertura(data);

      // Assert
      expect(nota).toBeNull();
    });
  });

  describe("quando as janelas em curso têm coberturas diferentes", () => {
    it("produz uma nota única com a cobertura mais recente", () => {
      // Arrange
      const data = response([
        deputado(1, {
          janela: { ...JANELA_EM_CURSO, coberturaAte: "2026-06-30" },
        }),
        deputado(2, {
          janela: { ...JANELA_EM_CURSO, coberturaAte: "2026-08-31" },
        }),
      ]);

      // Act
      const nota = toComparativoNotaCobertura(data);

      // Assert
      expect(nota).toBe("Dados cobertos até ago/2026");
    });
  });
});
