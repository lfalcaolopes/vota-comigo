import type { DeputadoDiscursosResponse } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeputadoDiscursosSection } from "../deputado-discursos";

const longSummary =
  "O deputado tratou da transparência no acesso aos dados públicos e da necessidade de preservar os registros oficiais para consulta dos cidadãos. Também apresentou considerações sobre fiscalização, participação social e clareza das informações publicadas pela Câmara. Esta parte final deve aparecer somente após a expansão do sumário completo.";

function response(): DeputadoDiscursosResponse {
  return {
    year: 2022,
    total: 1,
    items: [
      {
        dataHoraInicio: "2022-08-16T15:42:00",
        tipoDiscurso: "Discurso",
        fase: "Ordem do Dia",
        sumario: longSummary,
        assuntos: ["Transparência", "Dados públicos"],
        links: [],
      },
    ],
  };
}

describe("seção de discursos", () => {
  describe("quando o sumário é longo", () => {
    it("mostra uma prévia e mantém o texto recolhido fora da árvore inicial", () => {
      // Arrange
      const state = { status: "success" as const, response: response() };

      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoDiscursosSection, { state }),
      );

      // Assert
      expect(html).toContain("O deputado tratou da transparência");
      expect(html).not.toContain(
        "Esta parte final deve aparecer somente após a expansão",
      );
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain("Ler sumário completo");
    });
  });

  describe("quando o pronunciamento não tem sumário", () => {
    it("mantém data, tipo, fase e links externos na ordem do contrato", () => {
      // Arrange
      const data = response();
      data.items[0] = {
        ...data.items[0],
        sumario: null,
        links: [
          { kind: "video", url: "https://www.camara.leg.br/video/12345" },
          { kind: "audio", url: "https://www.camara.leg.br/audio/12345" },
          { kind: "text", url: "https://www.camara.leg.br/discurso/12345" },
        ],
      };

      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoDiscursosSection, {
          state: { status: "success", response: data },
        }),
      );

      // Assert
      expect(html).toContain("16/08/2022");
      expect(html).toContain("Discurso");
      expect(html).toContain("Fase: Ordem do Dia");
      expect(html.indexOf("Assistir discurso na Câmara")).toBeLessThan(
        html.indexOf("Ouvir discurso na Câmara"),
      );
      expect(html.indexOf("Ouvir discurso na Câmara")).toBeLessThan(
        html.indexOf("Ler discurso na Câmara"),
      );
      expect(html.match(/target="_blank"/g)).toHaveLength(3);
      expect(html).not.toContain("Sumário indisponível");
    });
  });

  describe("quando a consulta ainda não produziu uma lista", () => {
    it.each([
      [
        { status: "loading" as const },
        "Carregando conteúdo",
        "Nenhum discurso encontrado",
      ],
      [
        { status: "error" as const },
        "Não foi possível carregar os discursos agora.",
        "Nenhum discurso encontrado",
      ],
      [
        {
          status: "success" as const,
          response: { year: 2022, items: [], total: 0 },
        },
        "Nenhum discurso encontrado",
        "Não foi possível carregar os discursos agora.",
      ],
    ])("distingue carregamento, falha e ano vazio", (state, shown, hidden) => {
      // Act
      const html = renderToStaticMarkup(
        createElement(DeputadoDiscursosSection, { state }),
      );

      // Assert
      expect(html).toContain(shown);
      expect(html).not.toContain(hidden);
    });
  });
});
