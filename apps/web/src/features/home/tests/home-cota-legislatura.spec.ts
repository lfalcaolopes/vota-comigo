import type { CotaLegislaturaResponse } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CotaLegislaturaSection } from "../components/home-cota-legislatura";

const cota: CotaLegislaturaResponse = {
  legislatura: 57,
  periodStart: "2023-02-01",
  coberturaAte: "2026-08-31",
  deputadoCount: 860,
  totalAmountUsedCents: 88783067341,
  categories: [
    {
      externalNumSubCota: 5,
      description: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.",
      amountUsedCents: 34346502212,
    },
    {
      externalNumSubCota: 998,
      description: "PASSAGEM AÉREA - SIGEPA",
      amountUsedCents: 15493641628,
    },
    {
      externalNumSubCota: 120,
      description: "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
      amountUsedCents: 14552410628,
    },
    {
      externalNumSubCota: 1,
      description: "MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR",
      amountUsedCents: 11276105279,
    },
    {
      externalNumSubCota: 3,
      description: "COMBUSTÍVEIS E LUBRIFICANTES.",
      amountUsedCents: 7878270351,
    },
    {
      externalNumSubCota: 14,
      description: "HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.",
      amountUsedCents: 1314124669,
    },
    {
      externalNumSubCota: 10,
      description: "TELEFONIA",
      amountUsedCents: 1002451462,
    },
  ],
};

function render(input: CotaLegislaturaResponse | null): string {
  return renderToStaticMarkup(
    createElement(CotaLegislaturaSection, { cota: input }),
  );
}

describe("gastos da cota na home", () => {
  describe("com o agregado da legislatura", () => {
    it("publica o total gasto em reais", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("R$ 887.830.673,41");
    });

    it("deriva o período do dado, sem data cravada", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("fev/2023 – ago/2026");
    });

    it("diz quantos deputados foram considerados, no formato do período", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("Deputados considerados: 860");
      expect(html).toContain("titulares e suplentes");
    });
  });

  describe("recorte no título", () => {
    it("deriva o ano de início do dado, sem cravar", () => {
      // Arrange
      const outraJanela = { ...cota, periodStart: "2019-02-01" };

      // Act
      const atual = render(cota);
      const anterior = render(outraJanela);

      // Assert
      expect(atual).toContain("desde 2023");
      expect(anterior).toContain("desde 2019");
    });
  });

  describe("discriminação por rubrica", () => {
    it("mostra valor e participação de cada rubrica", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.");
      expect(html).toContain("R$ 343.465.022,12");
      expect(html).toContain("38,7%");
    });

    it("fecha a cauda no total de outras despesas, sem abrir a composição", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("Outras despesas");
      expect(html).toContain("R$ 23.165.761,31");
      expect(html).not.toContain("<details");
      expect(html).not.toContain("TELEFONIA");
    });
  });

  describe("revelacao progressiva da secao", () => {
    it("entrega as barras no estado final, sem depender de JS", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("width:38.69%");
      expect(html).not.toContain("data-reveal");
    });

    it("publica duracao e escalonamento de cada barra no proprio markup", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain("--vc-reveal-duration:3000ms");
      expect(html).toContain("--vc-reveal-delay:0ms");
      expect(html).toContain("--vc-reveal-delay:120ms");
    });

    it("mantem o total legivel por leitor de tela durante a contagem", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain('<span class="sr-only">R$ 887.830.673,41</span>');
    });
  });

  describe("caminhos que a seção referencia", () => {
    it("leva à discriminação dentro do perfil de cada deputado", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).toContain('href="/deputados"');
    });

    it("não oferece o ranking de menor uso, que engana em mandato curto", () => {
      // Arrange / Act
      const html = render(cota);

      // Assert
      expect(html).not.toContain("menor-uso-cota");
    });
  });

  describe("sem agregado disponível", () => {
    it("não sobe a seção em vez de mostrar total zerado", () => {
      // Arrange / Act
      const html = render(null);

      // Assert
      expect(html).toBe("");
    });
  });
});
