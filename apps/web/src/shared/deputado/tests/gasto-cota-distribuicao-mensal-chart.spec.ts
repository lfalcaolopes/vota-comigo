import type {
  DeputadoCeapCategory,
  DeputadoCeapMonth,
} from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GastoCotaDistribuicaoMensal } from "../gasto-cota-distribuicao-mensal-chart";

describe("gráfico mensal dos gastos da cota", () => {
  describe("quando o arquivo cobre apenas parte do ano", () => {
    it("apresenta os doze meses e identifica os meses ainda não carregados", () => {
      // Arrange
      const categories: DeputadoCeapCategory[] = [
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: 10_000,
        },
      ];
      const months = createMonths(8);

      // Act
      const html = renderToStaticMarkup(
        createElement(GastoCotaDistribuicaoMensal, {
          categories,
          months,
          totalAmountUsedCents: 10_000,
          year: 2024,
        }),
      );

      // Assert
      expect(html).toContain("Gastos por mês");
      for (const month of [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ]) {
        expect(html).toContain(`>${month}<`);
      }
      expect(html).toContain("Dados ainda não carregados");
      expect(html).toContain(
        "Setembro a dezembro aparecem como lacunas porque ainda não foram carregados",
      );
    });
  });

  describe("quando há gasto e compensação no mesmo mês", () => {
    it("expõe a escala absoluta e uma alternativa textual na ordem das séries", () => {
      // Arrange
      const categories: DeputadoCeapCategory[] = [
        {
          externalNumSubCota: 5,
          description: "Passagens aéreas",
          amountUsedCents: 1_000,
        },
        {
          externalNumSubCota: 3,
          description: "Combustíveis e lubrificantes",
          amountUsedCents: -100,
        },
      ];
      const months = createMonths(12);
      months[0] = {
        month: 1,
        totalAmountUsedCents: 900,
        categories: [
          { externalNumSubCota: 5, amountUsedCents: 1_000 },
          { externalNumSubCota: 3, amountUsedCents: -100 },
        ],
      };

      // Act
      const html = renderToStaticMarkup(
        createElement(GastoCotaDistribuicaoMensal, {
          categories,
          months,
          totalAmountUsedCents: 900,
          year: 2024,
        }),
      );

      // Assert
      expect(html).toContain(
        'aria-label="Gráfico de barras empilhadas dos gastos mensais em 2024"',
      );
      expect(html).toContain("Escala em valores absolutos");
      expect(html).toContain(
        'aria-label="Alternativa textual dos gastos mensais"',
      );
      const alternativaTextual = html.slice(
        html.indexOf('aria-label="Alternativa textual dos gastos mensais"'),
      );
      expect(alternativaTextual.indexOf("Passagens aéreas")).toBeLessThan(
        alternativaTextual.indexOf("Combustíveis e lubrificantes"),
      );
      expect(alternativaTextual).toContain("-R$ 1,00");
    });

    it("oferece uma região persistente para interação por ponteiro, toque e teclado", () => {
      // Arrange
      const categories: DeputadoCeapCategory[] = [
        {
          externalNumSubCota: 5,
          description: "Passagens aéreas",
          amountUsedCents: 1_000,
        },
      ];
      const months = createMonths(12);

      // Act
      const html = renderToStaticMarkup(
        createElement(GastoCotaDistribuicaoMensal, {
          categories,
          months,
          totalAmountUsedCents: 1_000,
          year: 2024,
        }),
      );

      // Assert
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain("Toque em uma barra ou selecione mês e categoria");
      expect(html).toContain("Explorar valores");
      expect(html).toContain("Selecione um mês");
      expect(html).toContain("Selecione uma categoria");
      expect(html).toContain("Ver tabela de gastos por mês");
      expect(html).toContain('class="max-w-full overflow-x-auto pb-2"');
    });
  });
});

function createMonths(coveredThroughMonth: number): DeputadoCeapMonth[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    totalAmountUsedCents: index < coveredThroughMonth ? 0 : null,
    categories: [],
  }));
}
