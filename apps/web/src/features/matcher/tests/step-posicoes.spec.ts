import type {
  ProposicaoCard,
  ProposicaoDetalhe,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  PosicaoConteudo,
  StepPosicoes,
} from "../components/posicoes/step-posicoes";

function card(overrides: Partial<ProposicaoCard> = {}): ProposicaoCard {
  return {
    externalIdProposicao: 1,
    siglaTipo: "PL",
    numero: 1234,
    ano: 2023,
    ementa: "Ementa oficial.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2023-01-01",
    volumeVotacoesPlenario: 3,
    dataUltimaVotacao: "2023-06-01",
    ...overrides,
  };
}

function detalhe(overrides: Partial<ProposicaoDetalhe> = {}): ProposicaoDetalhe {
  return {
    externalIdProposicao: 1,
    siglaTipo: "PL",
    numero: 1234,
    ano: 2023,
    ementa: "Dispoe sobre alguma coisa.",
    dataApresentacao: "2023-01-01",
    descricaoTipo: "Projeto de Lei",
    ementaDetalhada: "Texto mais longo explicando a proposicao.",
    keywords: null,
    urlInteiroTeor: "https://www.camara.leg.br/pdf/42",
    resumoIaDisponivel: true,
    resumoIaCard: "Resumo curto.",
    resumoIaDetalhe: "Resumo detalhado por IA.",
    status: {
      siglaOrgao: "PLEN",
      situacao: "Pronta para Pauta",
      regime: null,
      dataHora: "2025-03-14",
    },
    fonteOficial: "https://www.camara.leg.br/proposicao/42",
    camaraPollResultsUrl: "https://www.camara.leg.br/enquetes/42/resultados",
    temas: [{ externalCodTema: 1, tema: "Saude" }],
    votacoes: [],
    ...overrides,
  };
}

function renderStep(selected: ProposicaoCard[]): string {
  return renderToStaticMarkup(
    createElement(StepPosicoes, {
      selected,
      posicoes: new Map(),
      faltamRespostas: 0,
      faltamComputaveis: 0,
      canRun: false,
      onSetPosicao: vi.fn(),
      onBack: vi.fn(),
      onRun: vi.fn(),
    }),
  );
}

describe("StepPosicoes", () => {
  describe("when no proposition is selected", () => {
    it("invites the user to go back instead of rendering a card", () => {
      // Act
      const html = renderStep([]);

      // Assert
      expect(html).toContain("Nenhuma proposição selecionada.");
      expect(html).not.toContain("Na sua opinião, deveria ser aprovada?");
    });
  });

  describe("focus targets for keyboard and screen-reader users", () => {
    it("exposes the card and review panes as labelled, focusable groups", () => {
      // Arrange
      const selected = [card({ externalIdProposicao: 1 }), card({ externalIdProposicao: 2 })];

      // Act
      const html = renderStep(selected);

      // Assert
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Proposição 1 de 2"');
      expect(html).toContain('aria-label="Revisão das suas posições"');
      expect(html).toContain('tabindex="-1"');
    });
  });

  describe("while the proposition detail is loading", () => {
    it("shows a skeleton and hides the answer options", () => {
      // Act
      const html = renderStep([card()]);

      // Assert
      expect(html).toContain("Carregando conteúdo");
      expect(html).not.toContain("Na sua opinião, deveria ser aprovada?");
    });

    it("no longer redirects to the standalone proposition page", () => {
      // Act
      const html = renderStep([card({ externalIdProposicao: 42 })]);

      // Assert
      expect(html).not.toContain("Ver proposição");
      expect(html).not.toContain("/proposicoes/42");
    });
  });
});

describe("PosicaoConteudo", () => {
  describe("when the detail is ready", () => {
    it("places themes and official links above resumo, ementa and detailed ementa", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(PosicaoConteudo, {
          detalhe: detalhe(),
          current: undefined,
          faltamRespostas: 0,
          faltamComputaveis: 0,
          onSelect: vi.fn(),
        }),
      );

      // Assert
      const temasIndex = html.indexOf("Saude");
      const linksIndex = html.indexOf("Ver fonte oficial na Câmara");
      const resumoIndex = html.indexOf("Resumo detalhado por IA.");
      const ementaIndex = html.indexOf("Dispoe sobre alguma coisa.");
      const ementaDetalhadaIndex = html.indexOf(
        "Texto mais longo explicando a proposicao.",
      );

      expect(temasIndex).toBeGreaterThanOrEqual(0);
      expect(linksIndex).toBeGreaterThan(temasIndex);
      expect(resumoIndex).toBeGreaterThan(linksIndex);
      expect(ementaIndex).toBeGreaterThan(resumoIndex);
      expect(ementaDetalhadaIndex).toBeGreaterThan(ementaIndex);
    });

    it("shows the identifier header and the answer options", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(PosicaoConteudo, {
          detalhe: detalhe(),
          current: undefined,
          faltamRespostas: 0,
          faltamComputaveis: 0,
          onSelect: vi.fn(),
        }),
      );

      // Assert
      expect(html).toContain("PL 1234/2023");
      expect(html).toContain("Na sua opinião, deveria ser aprovada?");
    });

    it("omits the resumo and ementa sections when their data is absent", () => {
      // Act
      const html = renderToStaticMarkup(
        createElement(PosicaoConteudo, {
          detalhe: detalhe({
            resumoIaDisponivel: false,
            resumoIaDetalhe: null,
            ementa: null,
            ementaDetalhada: null,
          }),
          current: undefined,
          faltamRespostas: 0,
          faltamComputaveis: 0,
          onSelect: vi.fn(),
        }),
      );

      // Assert
      expect(html).not.toContain("Resumo por IA");
      expect(html).not.toContain("Ementa oficial");
      expect(html).not.toContain("Ementa detalhada");
      expect(html).toContain("Na sua opinião, deveria ser aprovada?");
    });
  });
});
