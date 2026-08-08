import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProposicaoResumo } from "../proposicao-resumo";

const TEXTO_CURTO = "Reforma da previdência.";
const TEXTO_LONGO =
  "Reforma constitucional da previdência que cria um novo regime de " +
  "capitalização, altera regras de idade mínima e tempo de contribuição e " +
  "estabelece regras de transição para quem já está no mercado de trabalho.";

function render(props: {
  texto: string;
  identificador?: string;
  clampClassName?: string;
}): string {
  return renderToStaticMarkup(
    createElement(ProposicaoResumo, {
      identificador: props.identificador ?? "PEC 6/2019",
      texto: props.texto,
      clampClassName: props.clampClassName,
    }),
  );
}

describe("ProposicaoResumo", () => {
  describe("when the summary fits the available space", () => {
    it("shows the whole text without offering an expand control", () => {
      // Arrange / Act
      const html = render({ texto: TEXTO_CURTO });

      // Assert
      expect(html).toContain(TEXTO_CURTO);
      expect(html).not.toContain("Ver mais");
      expect(html).not.toContain("<button");
    });
  });

  describe("when the summary is longer than the clamp", () => {
    it("keeps the text clamped and offers an expand control", () => {
      // Arrange / Act
      const html = render({ texto: TEXTO_LONGO });

      // Assert
      expect(html).toContain("line-clamp-2");
      expect(html).toContain("Ver mais");
      expect(html).toContain('aria-expanded="false"');
    });

    it("names the expand control after the proposicao so repeated controls stay distinguishable", () => {
      // Arrange / Act
      const html = render({ texto: TEXTO_LONGO, identificador: "PEC 6/2019" });

      // Assert
      expect(html).toContain(
        'aria-label="Ver mais do resumo de PEC 6/2019"',
      );
    });

    it("leaves the end of the clamped line free so the browser draws its own ellipsis", () => {
      // Arrange / Act
      const html = render({ texto: TEXTO_LONGO });

      // Assert
      expect(html).not.toContain("absolute");
      expect(html).not.toContain("…");
    });

    it("points the expand control at the paragraph it expands", () => {
      // Arrange / Act
      const html = render({ texto: TEXTO_LONGO });
      const paragraphId = /<p[^>]*id="([^"]+)"/.exec(html)?.[1];

      // Assert
      expect(paragraphId).toBeTruthy();
      expect(html).toContain(`aria-controls="${paragraphId}"`);
    });

    it("respects the clamp requested by the host layout", () => {
      // Arrange / Act
      const html = render({
        texto: TEXTO_LONGO,
        clampClassName: "line-clamp-3",
      });

      // Assert
      expect(html).toContain("line-clamp-3");
      expect(html).not.toContain("line-clamp-2");
    });
  });
});
