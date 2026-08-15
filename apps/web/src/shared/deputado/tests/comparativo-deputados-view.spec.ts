import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComparativoDeputadosView } from "../comparativo-deputados-view";

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

const JANELA_57_COBERTURA_PARCIAL = {
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
      anos: [
        {
          year: 2023,
          naComparacao: true,
          percentualSobreMedianaUf: 110,
          diasEmExercicio: 334,
          diasNoAno: 334,
          medianaUfDeputadoCount: 53,
          dadoIncompleto: false,
        },
        {
          year: 2024,
          naComparacao: true,
          percentualSobreMedianaUf: 114,
          diasEmExercicio: 366,
          diasNoAno: 366,
          medianaUfDeputadoCount: 53,
          dadoIncompleto: false,
        },
      ],
      anosNaComparacao: 2,
      diasEmExercicio: 700,
      diasNaComparacao: 700,
    },
    ...overrides,
  };
}

function render(response: ComparativoDeputadosResponse): string {
  return renderToStaticMarkup(
    createElement(ComparativoDeputadosView, { response }),
  );
}

describe("ComparativoDeputadosView", () => {
  describe("quando dois deputados são comparados na mesma janela", () => {
    it("mostra cada métrica e leva ao perfil em nova aba", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("Presença registrada");
      expect(html).toContain("Proposições assinadas");
      expect(html).toContain("Órgãos distintos");
      expect(html).toContain("Cota parlamentar");
      expect(html).toContain('href="/deputados/1"');
      expect(html).toContain('target="_blank"');
    });

    it("mostra a posição na cota sem o valor gasto", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("12% acima da mediana");
      expect(html).toContain(
        "700 de 700 dias em exercício · 2 anos comparados",
      );
      expect(html).not.toContain("R$");
    });

    it("mostra a posição de cada ano da janela sob a célula da cota", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("2023 · 110%");
      expect(html).toContain("2024 · 114%");
    });

    it("mostra o cabeçalho de janela com legislatura, período e dias em exercício", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("57ª legislatura");
      expect(html).toContain("fev/2023");
      expect(html).toContain("800 dias em exercício");
    });

    it("não mostra a linha de cobertura quando a janela está totalmente coberta", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).not.toContain("Dados cobertos até");
    });

    it("mostra a linha de cobertura quando a janela ainda está em curso", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [
          deputado(1, { janela: JANELA_57_COBERTURA_PARCIAL }),
          deputado(2, { janela: JANELA_57_COBERTURA_PARCIAL }),
        ],
      });

      // Assert
      expect(html).toContain("Dados cobertos até jun/2026");
    });

    it("não mostra nenhum aviso no topo", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).not.toContain("Legislaturas diferentes");
      expect(html).not.toContain("fora da base comparável");
    });
  });

  describe("quando as legislaturas dos deputados divergem", () => {
    it("mostra o aviso de divergência acima da grade", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: false,
        items: [
          deputado(1, { nomePublico: "Erika Kokay", janela: JANELA_57 }),
          deputado(2, { nomePublico: "Kim Kataguiri", janela: JANELA_56 }),
        ],
      });

      // Assert
      expect(html).toContain("Legislaturas diferentes");
      expect(html).toContain("57ª (Erika Kokay)");
      expect(html).toContain("56ª (Kim Kataguiri)");
    });
  });

  describe("quando um deputado está abaixo do piso da 55ª legislatura", () => {
    it("mostra a recusa e não a divergência", () => {
      // Arrange
      const semJanela = {
        janela: JANELA_INDISPONIVEL,
        resumoPresencaDisponivel: false,
        resumoPresenca: null,
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
      };

      // Act
      const html = render({
        janelasCoincidem: false,
        items: [deputado(1, semJanela), deputado(2)],
      });

      // Assert
      expect(html).toContain("Um dos deputados está fora da base comparável");
      expect(html).toContain("Fora da base comparável");
      expect(html).toContain("Sem dados comparáveis");
      expect(html).not.toContain("Legislaturas diferentes");
    });
  });
});
