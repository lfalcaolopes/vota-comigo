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
          shareA: 0.46,
          expectedVotos: 25_000_000,
          countedVotos: 5_000_000,
        },
        {
          siglaUf: "ba",
          shareA: 0.72,
          expectedVotos: 9_000_000,
          countedVotos: 8_000_000,
        },
        {
          siglaUf: "rr",
          shareA: 0.3,
          expectedVotos: 300_000,
          countedVotos: 0,
        },
        {
          siglaUf: "zz",
          shareA: 0.56,
          expectedVotos: 300_000,
          countedVotos: 0,
        },
      ],
      urnasApuradasByUf: { sp: 20, ba: 88.5 },
      variacaoEntreTurnos: 0.037,
    }),
  );
}

describe("mapa de estados da apuração", () => {
  describe("ao abrir", () => {
    it("mostra o estado com mais votos por apurar no painel de detalhe", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain("faltam 20 mi votos");
      expect(html).toMatch(/<p[^>]*>São Paulo<\/p>/);
    });
  });

  describe("para leitores de tela", () => {
    it("descreve quem lidera e quanto do estado foi apurado sem depender da cor", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain(
        "Bahia: Lula à frente com 72,0% na projeção; 88,5% das urnas apuradas",
      );
    });

    it("mantém o exterior acessível fora do mapa", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain(
        "Exterior: Lula à frente com 56,0% na projeção; 0,0% das urnas apuradas",
      );
    });
  });

  describe("estado sem urnas apuradas", () => {
    it("aparece hachurado no mapa e explicado na legenda", () => {
      // Act
      const html = render();

      // Assert
      expect(html).toContain('fill="url(#uf-sem-apuracao)"');
      expect(html).toContain("Sem urnas apuradas: estimativa pelo 1º turno");
    });

    it("hachura só os estados ainda sem votos apurados", () => {
      // Act
      const html = render();

      // Assert
      expect(html.match(/fill="url\(#uf-sem-apuracao\)"/g)).toHaveLength(1);
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
