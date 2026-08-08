import type {
  MatcherVotoDetalhe,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VotoDetalheItem } from "../components/detalhe/voto-detalhe-item";

const EMENTA_LONGA =
  "Reforma constitucional da previdência que cria um novo regime de " +
  "capitalização e estabelece regras de transição.";

function proposicao(overrides: Partial<ProposicaoCard> = {}): ProposicaoCard {
  return {
    externalIdProposicao: 42,
    siglaTipo: "PEC",
    numero: 6,
    ano: 2019,
    ementa: "Ementa oficial.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2019-01-01",
    volumeVotacoesPlenario: 2,
    dataUltimaVotacao: "2019-07-10",
    ...overrides,
  };
}

function voto(overrides: Partial<ProposicaoCard> = {}): MatcherVotoDetalhe {
  return {
    proposicao: proposicao(overrides),
    posicaoUsuario: "aprovar",
    votacaoReferencia: {
      externalIdVotacao: "votacao-42",
      data: "2019-07-10",
      descricao: "Votação em segundo turno",
      pattern: "pec_segundo_turno",
      votosSim: 370,
      votosNao: 124,
      votosOutros: 2,
      resultado: "aprovada",
    },
    situacaoDeputadoVotacao: "sim",
    matcherEffect: "concordancia",
  };
}

function render(overrides: Partial<ProposicaoCard> = {}): string {
  return renderToStaticMarkup(
    createElement(VotoDetalheItem, { voto: voto(overrides) }),
  );
}

describe("VotoDetalheItem", () => {
  describe("when showing a vote of the deputado", () => {
    it("links the identificador to the proposicao page in a new tab", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain("PEC 6/2019");
      expect(html).toContain('href="/proposicoes/42"');
      expect(html).toContain('target="_blank"');
    });

    it("prefers the approved AI summary over the official ementa", () => {
      // Arrange / Act
      const html = render({
        resumoIaDisponivel: true,
        resumoIaCard: "Resumo curto aprovado.",
      });

      // Assert
      expect(html).toContain("Resumo curto aprovado.");
      expect(html).not.toContain("Ementa oficial.");
    });
  });

  describe("when the summary is longer than the clamp", () => {
    it("offers an expand control instead of hiding the rest of the text", () => {
      // Arrange / Act
      const html = render({ ementa: EMENTA_LONGA });

      // Assert
      expect(html).toContain(EMENTA_LONGA);
      expect(html).toContain('aria-label="Ver mais do resumo de PEC 6/2019"');
    });

    it("keeps the expand control outside the proposicao link", () => {
      // Arrange / Act
      const html = render({ ementa: EMENTA_LONGA });

      // Assert
      expect(html.indexOf("</a>")).toBeLessThan(html.indexOf("<button"));
    });
  });
});
