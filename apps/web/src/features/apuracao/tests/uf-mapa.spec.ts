import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UfMapa } from "../components/uf-mapa";
import { buildUfShapes, MAPA_HEIGHT, MAPA_WIDTH } from "../lib/mapa-ufs";

function render() {
  return renderToStaticMarkup(
    createElement(UfMapa, {
      nomeA: "Lula",
      nomeB: "Flavio Bolsonaro",
      shapes: buildUfShapes(),
      mapaWidth: MAPA_WIDTH,
      mapaHeight: MAPA_HEIGHT,
      ufs: [
        {
          siglaUf: "sp",
          urnasApuradas: 99.99,
          votosA: 12_116_838,
          votosB: 14_137_519,
          shareA: 0.4615,
        },
        {
          siglaUf: "ba",
          urnasApuradas: 99.8,
          votosA: 6_480_000,
          votosB: 2_520_000,
          shareA: 0.72,
        },
        {
          siglaUf: "zz",
          urnasApuradas: 96.97,
          votosA: 194_563,
          votosB: 168_210,
          shareA: 0.5363,
        },
      ],
    }),
  );
}

describe("mapa de estados da apuração", () => {
  describe("ao abrir", () => {
    it("mostra São Paulo no painel de detalhe com os votos de cada candidato", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toMatch(/<p[^>]*>São Paulo<\/p>/);
      expect(html).toContain("12,1 mi votos");
      expect(html).toContain("14,1 mi votos");
    });
  });

  describe("para leitores de tela", () => {
    it("descreve quem venceu em cada estado sem depender da cor", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain("Bahia: Lula venceu com 72,0%");
    });

    it("mantém o exterior acessível fora do mapa", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain("Exterior: Lula venceu com 53,6%");
    });
  });

  describe("geometria", () => {
    it("desenha as 27 UFs e só rotula as que cabem a sigla", () => {
      // Act
      const shapes = buildUfShapes();

      // Assert
      expect(shapes).toHaveLength(27);
      expect(shapes.every((shape) => shape.d.startsWith("M"))).toBe(true);
      expect(shapes.find((shape) => shape.siglaUf === "df")?.showLabel).toBe(
        false,
      );
      expect(shapes.find((shape) => shape.siglaUf === "am")?.showLabel).toBe(
        true,
      );
    });
  });
});
