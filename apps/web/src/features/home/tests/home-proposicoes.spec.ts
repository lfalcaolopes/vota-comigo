import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ProposicaoCard } from "@vota-comigo/shared-types";

import {
  DestaquesList,
  ProposicoesSection,
} from "../components/home-proposicoes";

function renderSection(): string {
  return renderToStaticMarkup(createElement(ProposicoesSection, null, null));
}

describe("entrada de propostas na home", () => {
  describe("papel na comparação", () => {
    it("apresenta as propostas como as perguntas que o visitante vai responder", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain(
        "Você responde sobre as mesmas propostas que os deputados votaram",
      );
      expect(html).not.toContain("A comparação sai daqui");
    });
  });

  describe("selo de resumo por IA", () => {
    it("aponta o texto oficial sem explicar o selo em frase longa", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("O texto oficial fica a um clique.");
      expect(html).not.toContain("Onde aparece este selo");
    });
  });

  describe("busca por assunto", () => {
    it("referencia a busca em vez de embutir um segundo campo na home", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).not.toContain("<form");
      expect(html).not.toContain('name="q"');
    });

    it("demonstra o tipo de termo aceito pelos exemplos", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("Cotas para negros");
    });

    it("oferece os assuntos depois dos destaques, sem mandar começar por eles", () => {
      // Arrange
      const html = renderToStaticMarkup(
        createElement(
          ProposicoesSection,
          null,
          createElement("p", null, "destaques-da-home"),
        ),
      );

      // Act
      const destaques = html.indexOf("destaques-da-home");
      const assuntos = html.indexOf("Buscar por assunto:");

      // Assert
      expect(assuntos).toBeGreaterThan(destaques);
      expect(html).not.toContain("Comece por");
    });

    it("não anuncia que entende linguagem comum", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).not.toContain("linguagem comum");
    });
  });

  describe("termos de exemplo", () => {
    it("dispara a busca ao ser clicado", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain('href="/proposicoes?q=cotas+para+negros"');
    });
  });

  describe("caminho para a lista completa", () => {
    it("oferece a lista completa depois das propostas em destaque", () => {
      // Arrange
      const html = renderToStaticMarkup(
        createElement(
          ProposicoesSection,
          null,
          createElement("p", null, "destaques-da-home"),
        ),
      );

      // Act
      const destaques = html.indexOf("destaques-da-home");
      const listaCompleta = html.indexOf("Ver todas as propostas");

      // Assert
      expect(destaques).toBeGreaterThan(-1);
      expect(listaCompleta).toBeGreaterThan(destaques);
    });
  });

  describe("assuntos para buscar", () => {
    it("não oferece busca pelos assuntos que se resumem a uma proposta só", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).not.toContain(">Trabalho 6x1<");
      expect(html).not.toContain(">Reforma da Previdência<");
      expect(html).not.toContain(">Porte de arma<");
      expect(html).toContain(">Cotas para negros<");
    });

    it("oferece licenciamento ambiental como assunto com várias propostas", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain('href="/proposicoes?q=licenciamento+ambiental"');
    });
  });

  describe("assunto de cada destaque", () => {
    it("marca a proposta com o assunto que a trouxe", () => {
      // Arrange
      const card = {
        externalIdProposicao: 2233802,
        siglaTipo: "PEC",
        numero: 221,
        ano: 2019,
        ementa: "Reduz a jornada de trabalho.",
        resumoIaDisponivel: false,
        resumoIaCard: null,
        dataApresentacao: "2019-12-03",
        volumeVotacoesPlenario: 3,
        dataUltimaVotacao: "2026-05-27",
      } as unknown as ProposicaoCard;

      // Act
      const html = renderToStaticMarkup(
        createElement(DestaquesList, {
          items: [
            { card, topic: "Trabalho 6x1" },
            { card: { ...card, externalIdProposicao: 1 }, topic: null },
          ],
        }),
      );

      // Assert
      expect(html.match(/Trabalho 6x1/g) ?? []).toHaveLength(1);
      expect(html).toContain('href="/proposicoes/2233802"');
    });
  });

  describe("vocabulário da interface", () => {
    it("chama proposição de proposta na tela", () => {
      // Arrange / Act
      const html = renderSection();

      // Assert
      expect(html).toContain("proposta");
      expect(html).not.toContain("proposição");
    });
  });
});
