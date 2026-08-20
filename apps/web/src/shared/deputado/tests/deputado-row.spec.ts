import type { DeputadoCard } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoRow } from "../deputado-row";

const card: DeputadoCard = {
  externalIdDeputado: 220593,
  nomePublico: "Maria da Silva",
  nomeCivil: "Maria Aparecida da Silva",
  siglaPartido: "PT",
  siglaUf: "SP",
  urlFoto: null,
  emAtividade: true,
  usoCota: {
    status: "indisponivel",
    legislatura: null,
    motivo: "fonte-incompleta",
  },
};

function render(overrides: Partial<DeputadoCard> = {}): string {
  return renderToStaticMarkup(
    createElement(DeputadoRow, {
      card: { ...card, ...overrides },
      href: `/deputados/${card.externalIdDeputado}`,
    }),
  );
}

function renderComUsoCota(usoCota: DeputadoCard["usoCota"]): string {
  return renderToStaticMarkup(
    createElement(DeputadoRow, {
      card: { ...card, usoCota },
      showUsoCota: true,
    }),
  );
}

function renderSelecionavel(
  selection: { disabled: boolean; selected: boolean } = {
    disabled: false,
    selected: false,
  },
): string {
  return renderToStaticMarkup(
    createElement(DeputadoRow, {
      card,
      selection: { ...selection, onToggle: () => {} },
    }),
  );
}

describe("DeputadoRow", () => {
  describe("when rendering a deputado card", () => {
    it("renders identity, public snapshot fields, activity, and profile link", () => {
      // Arrange / Act
      const html = render();

      // Assert
      expect(html).toContain('href="/deputados/220593"');
      expect(html).not.toContain('target="_blank"');
      expect(html).toContain("Maria da Silva");
      expect(html).toContain("PT");
      expect(html).toContain("SP");
      expect(html).toContain("Em exercício");
      expect(html).not.toContain("Nome civil");
    });
  });

  describe("when snapshot fields are missing", () => {
    it("renders explicit not-informed text", () => {
      // Arrange / Act
      const html = render({
        nomePublico: null,
        siglaPartido: null,
        siglaUf: null,
        emAtividade: false,
      });

      // Assert
      expect(html).toContain("Nome não informado");
      expect(html).toContain("Partido não informado");
      expect(html).toContain("UF não informada");
      expect(html).toContain("Fora de exercício");
    });
  });

  describe("when the row is in selection mode", () => {
    it("offers a checkbox instead of the profile link", () => {
      // Arrange / Act
      const html = renderSelecionavel();

      // Assert
      expect(html).toContain('type="checkbox"');
      expect(html).toContain(
        'aria-label="Selecionar Maria da Silva para comparação"',
      );
      expect(html).not.toContain("<a ");
    });

    it("marks the selected deputado", () => {
      // Arrange / Act
      const html = renderSelecionavel({ disabled: false, selected: true });

      // Assert
      expect(html).toContain("checked");
    });

    it("blocks a deputado beyond the selection limit", () => {
      // Arrange / Act
      const html = renderSelecionavel({ disabled: true, selected: false });

      // Assert
      expect(html).toContain("disabled");
      expect(html).toContain('aria-disabled="true"');
    });
  });

  describe("when cota ordering is active", () => {
    it("shows the rounded percentage, period, and days in office", () => {
      // Act
      const html = renderComUsoCota({
        status: "calculavel",
        percentualTetoBase: 71.6,
        legislatura: 57,
        periodStart: "2023-02-01",
        coberturaAte: "2026-08-31",
        diasEmExercicio: 1_184,
      });

      // Assert
      expect(html).toContain("Uso da cota: 72%");
      expect(html).toContain(
        "Período analisado: fev/2023 – ago/2026 · 1.184 dias em exercício",
      );
    });

    it("distinguishes unavailable use from zero", () => {
      // Act
      const html = renderComUsoCota({
        status: "indisponivel",
        legislatura: 57,
        motivo: "sigepa-incompleto",
      });

      // Assert
      expect(html).toContain("Uso da cota indisponível");
      expect(html).not.toContain("Uso da cota: 0%");
    });
  });
});
