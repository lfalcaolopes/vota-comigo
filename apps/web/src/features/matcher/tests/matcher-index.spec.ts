import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MatcherRascunhoChoice } from "../components/flow/matcher-index";

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
