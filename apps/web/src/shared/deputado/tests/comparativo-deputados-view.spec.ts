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
      gastoNaComparacaoCents: 110_000_000,
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

function render(
  response: ComparativoDeputadosResponse,
  showCopyButton?: boolean,
): string {
  return renderToStaticMarkup(
    createElement(ComparativoDeputadosView, { response, showCopyButton }),
  );
}

describe("ComparativoDeputadosView", () => {
  describe("quando o recorte pode ser levado embora em texto", () => {
    it("oferece o gesto de copiar junto da comparação", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("Copiar em texto");
    });

    it("cala o botão quando a tela que embute a view já tem o seu", () => {
      // Arrange / Act
      const html = render(
        { janelasCoincidem: true, items: [deputado(1), deputado(2)] },
        false,
      );

      // Assert
      expect(html).not.toContain("Copiar em texto");
    });
  });

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
      expect(html).toContain("Gasto da cota parlamentar");
      expect(html).toContain('href="/deputados/1"');
      expect(html).toContain('target="_blank"');
    });

    it("mostra o gasto por ano com o total e a posição frente à mediana", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("R$ 550 mil/ano");
      expect(html).toContain("R$ 1,1 mi no total · 12% acima da mediana do MG");
    });

    it("leva ao ano a ano no perfil em vez de detalhar os anos na célula", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain('href="/deputados/1?year=2024#gastos"');
      expect(html).toContain("Ver mais detalhes no perfil");
      expect(html).not.toContain("2023 · 110%");
    });

    it("mostra o cabeçalho de janela com período e dias em exercício, sem o número da legislatura", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).toContain("fev/2023");
      expect(html).toContain("800 dias em exercício");
      expect(html).not.toContain("57ª legislatura");
    });

    it("não mostra a nota de cobertura quando a janela está totalmente coberta", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [deputado(1), deputado(2)],
      });

      // Assert
      expect(html).not.toContain("Dados cobertos até");
    });

    it("mostra a cobertura uma única vez, como nota da comparação", () => {
      // Arrange / Act
      const html = render({
        janelasCoincidem: true,
        items: [
          deputado(1, { janela: JANELA_57_COBERTURA_PARCIAL }),
          deputado(2, { janela: JANELA_57_COBERTURA_PARCIAL }),
        ],
      });

      // Assert
      expect(html.split("Dados cobertos até jun/2026")).toHaveLength(2);
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
