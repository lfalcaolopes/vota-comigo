import { describe, expect, it } from "vitest";

import { SITE_NAME, siteUrl } from "@/shared/lib/site";

import { buildDeputadosText } from "../deputados-text";

const SALVO_EM = new Date(2026, 7, 15);

function deputado(
  overrides: Partial<
    Parameters<typeof buildDeputadosText>[0]["deputados"][number]
  > = {},
) {
  return {
    externalIdDeputado: 204521,
    nome: "Fulana de Tal",
    siglaPartido: "PT",
    siglaUf: "SP",
    compatibilidade: null,
    ...overrides,
  };
}

describe("buildDeputadosText", () => {
  describe("when the recorte carries context and a metric per deputado", () => {
    it("produces every layer of the format", () => {
      // Arrange
      const deputados = [
        deputado({ compatibilidade: 83 }),
        deputado({
          externalIdDeputado: 178903,
          nome: "Beltrano Silva",
          siglaPartido: "PSOL",
          siglaUf: "RJ",
          compatibilidade: 79,
        }),
      ];

      // Act
      const texto = buildDeputadosText({
        deputados,
        contexto: "12 proposições · São Paulo",
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toBe(
        [
          `${SITE_NAME} — deputados de interesse`,
          "Salvo em 15/08/2026 · 12 proposições · São Paulo",
          "",
          "- Fulana de Tal (PT-SP) — 83% de compatibilidade",
          `  ${siteUrl}/deputados/204521`,
          "",
          "- Beltrano Silva (PSOL-RJ) — 79% de compatibilidade",
          `  ${siteUrl}/deputados/178903`,
        ].join("\n"),
      );
    });

    it("rounds the metric to whole percents", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [deputado({ compatibilidade: 82.6 })],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toContain("— 83% de compatibilidade");
    });
  });

  describe("when the recorte has no context and no metric", () => {
    it("collapses to the degraded form without leaving separators behind", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [deputado()],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toBe(
        [
          `${SITE_NAME} — deputados de interesse`,
          "Salvo em 15/08/2026",
          "",
          "- Fulana de Tal (PT-SP)",
          `  ${siteUrl}/deputados/204521`,
        ].join("\n"),
      );
    });
  });

  describe("when the public data of a deputado is incomplete", () => {
    it("drops the parenthesis entirely when neither partido nor uf is known", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [deputado({ siglaPartido: null, siglaUf: null })],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toContain("- Fulana de Tal\n");
      expect(texto).not.toContain("(");
    });

    it("keeps the parenthesis with whatever half is known", () => {
      // Act
      const semUf = buildDeputadosText({
        deputados: [deputado({ siglaUf: null })],
        contexto: null,
        salvoEm: SALVO_EM,
      });
      const semPartido = buildDeputadosText({
        deputados: [deputado({ siglaPartido: null })],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(semUf).toContain("- Fulana de Tal (PT)");
      expect(semPartido).toContain("- Fulana de Tal (SP)");
    });

    it("falls back to the generic cargo label when the deputado has no public name", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [deputado({ nome: null })],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toContain("- Deputado federal (PT-SP)");
    });
  });

  describe("when the text lands in a plain-text destination", () => {
    it("uses no markup beyond hyphens and line breaks", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [deputado({ compatibilidade: 83 })],
        contexto: "3 deputados comparados",
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).not.toMatch(/[*_#`|[\]]/u);
      expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
    });

    it("separates entries with a blank line and indents each link under its deputado", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [
          deputado(),
          deputado({ externalIdDeputado: 178903, nome: "Beltrano Silva" }),
        ],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toContain(
        `${siteUrl}/deputados/204521\n\n- Beltrano Silva`,
      );
      expect(texto).not.toMatch(/\n\n\n/);
    });

    it("ends without trailing whitespace", () => {
      // Act
      const texto = buildDeputadosText({
        deputados: [deputado()],
        contexto: null,
        salvoEm: SALVO_EM,
      });

      // Assert
      expect(texto).toBe(texto.trimEnd());
    });
  });
});
