import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  MatcherOnboarding,
  MatcherRascunhoChoice,
} from "../components/flow/matcher-index";

describe("Entrada do matcher sem rascunho", () => {
  describe("quando uma nova comparação será iniciada", () => {
    it("explica o processo e oferece começar a comparação", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(MatcherOnboarding, { onStart: vi.fn() }),
      );

      // Assert
      expect(html).toContain("Compare suas posições com votos reais da Câmara");
      expect(html).toContain(
        "Na eleição, você faz uma escolha para deputado federal.",
      );
      expect(html).toContain("Escolha o que importa para você");
      expect(html).toContain("Declare suas posições");
      expect(html).toContain("Compare com votos registrados");
      expect(html).toContain("Ele não é uma recomendação de voto.");
      expect(html).toContain("Começar comparação");
    });
  });
});

describe("Entrada do matcher com rascunho", () => {
  describe("quando existem escolhas salvas na aba", () => {
    it("oferece retomar ou começar uma nova comparação", () => {
      // Arrange / Act
      const html = renderToStaticMarkup(
        createElement(MatcherRascunhoChoice, {
          onResume: vi.fn(),
          onStartOver: vi.fn(),
          siglaUf: "SP",
          totalRespondidas: 4,
          totalSelecionadas: 7,
        }),
      );

      // Assert
      expect(html).toContain("Você tem uma comparação em andamento");
      expect(html).toContain("Continuar comparação");
      expect(html).toContain("Começar nova comparação");
      expect(html).toContain("SP");
      expect(html).toContain(">7<");
      expect(html).toContain(">4<");
    });
  });
});
