import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { ProposicaoDetalhe as ProposicaoDetalheData } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { ProposicaoDetalhe } from "../proposicao-detalhe";

function makeProposicao(
  overrides: Partial<ProposicaoDetalheData> = {},
): ProposicaoDetalheData {
  return {
    externalIdProposicao: 42,
    siglaTipo: "PL",
    numero: 1234,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    dataApresentacao: "2023-05-10",
    descricaoTipo: "Projeto de Lei",
    ementaDetalhada: "Texto mais longo explicando a proposição.",
    keywords: "Saúde pública.",
    urlInteiroTeor:
      "https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=42",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    resumoIaDetalhe: null,
    status: {
      siglaOrgao: "PLEN",
      situacao: "Pronta para Pauta",
      regime: "Prioridade",
      dataHora: "2025-03-14T15:00",
    },
    fonteOficial:
      "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=42",
    temas: [{ externalCodTema: 37, tema: "Saúde" }],
    votacoes: [
      {
        externalIdVotacao: "42-1",
        data: "2025-03-14",
        descricao: "Aprovado o Projeto de Lei",
        placar: {
          placarCompleto: false,
          votosSim: 300,
          votosNao: 100,
          votosOutros: 5,
        },
        resultado: "aprovada",
        isReferenciaMatcher: true,
      },
      {
        externalIdVotacao: "42-2",
        data: "2024-12-10",
        descricao: "Votação anterior",
        placar: {
          placarCompleto: false,
          votosSim: 250,
          votosNao: 150,
          votosOutros: 2,
        },
        resultado: "rejeitada",
        isReferenciaMatcher: false,
      },
    ],
    ...overrides,
  };
}

function render(proposicao: ProposicaoDetalheData): string {
  return renderToStaticMarkup(createElement(ProposicaoDetalhe, { proposicao }));
}

describe("ProposicaoDetalhe", () => {
  describe("metadados publicos", () => {
    it("shows statistics, official links and the reduced current tramitation", () => {
      // Arrange
      const proposicao = makeProposicao();

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).toContain("Estatísticas");
      expect(html).toContain("Total de votações nominais");
      expect(html).toContain(">2</dd>");
      expect(html).toContain("Última votação");
      expect(html).toContain("14 mar 2025");
      expect(html).toContain("Ver PDF da proposição");
      expect(html).toContain("Ver fonte oficial na Câmara");
      expect(html).toContain("Situação");
      expect(html).toContain("Pronta para Pauta");
      expect(html).not.toContain("Órgão");
      expect(html).not.toContain("Regime");
      expect(html).not.toContain("Prioridade");
    });

    it("hides the PDF link when inteiro teor is absent", () => {
      // Arrange
      const proposicao = makeProposicao({ urlInteiroTeor: null });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).not.toContain("Ver PDF da proposição");
      expect(html).toContain("Ver fonte oficial na Câmara");
    });
  });

  describe("resumo de proposicao por IA", () => {
    it("shows the approved detailed resumo when available", () => {
      // Arrange
      const proposicao = makeProposicao({
        resumoIaDisponivel: true,
        resumoIaCard: "Resumo curto aprovado.",
        resumoIaDetalhe: "Resumo detalhado aprovado em linguagem acessível.",
      });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).toContain("Resumo por IA");
      expect(html).toContain(
        "Resumo detalhado aprovado em linguagem acessível.",
      );
    });

    it("does not render an empty IA resumo section when unavailable", () => {
      // Arrange
      const proposicao = makeProposicao({
        resumoIaDisponivel: false,
        resumoIaCard: null,
        resumoIaDetalhe: null,
      });

      // Act
      const html = render(proposicao);

      // Assert
      expect(html).not.toContain("Resumo por IA");
    });
  });
});
