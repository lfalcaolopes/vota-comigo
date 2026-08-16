import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CopyDeputadosButton } from "../copy-deputados-button";

const UM_DEPUTADO = [
  {
    externalIdDeputado: 204521,
    nome: "Fulana de Tal",
    siglaPartido: "PT",
    siglaUf: "SP",
    compatibilidade: null,
  },
];

const DOIS_DEPUTADOS = [
  ...UM_DEPUTADO,
  {
    externalIdDeputado: 204522,
    nome: "Beltrano de Tal",
    siglaPartido: "PL",
    siglaUf: "MG",
    compatibilidade: null,
  },
];

type Deputados = (typeof DOIS_DEPUTADOS)[number][];

function render(
  deputados: Deputados = UM_DEPUTADO,
  contexto: string | null = null,
): string {
  return renderToStaticMarkup(
    createElement(CopyDeputadosButton, { deputados, contexto }),
  );
}

describe("CopyDeputadosButton", () => {
  describe("when the page loads", () => {
    it("offers the copy gesture as a button", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain("Copiar dados do deputado");
      expect(html).toContain('type="button"');
    });

    it("keeps a polite live region ready so the confirmation is announced", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
    });

    it("does not announce a copy that has not happened", () => {
      // Act
      const html = render();

      // Assert
      expect(html).not.toContain("Dados copiados");
    });

    it("keeps the manual fallback closed until the copy fails", () => {
      // Act
      const html = render();

      // Assert
      expect(html).not.toContain("textarea");
      expect(html).toContain('aria-expanded="false"');
    });
  });

  describe("when several deputados are compared", () => {
    it("names the list as the object of the copy", () => {
      // Act
      const html = render(DOIS_DEPUTADOS);

      // Assert
      expect(html).toContain("Copiar lista de deputados");
      expect(html).not.toContain("Copiar dados do deputado");
    });
  });
});
