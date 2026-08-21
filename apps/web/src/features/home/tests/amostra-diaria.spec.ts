import { describe, expect, it } from "vitest";

import { toDiaIndex, toOffsetAmostraDiaria } from "../lib/amostra-diaria";

describe("amostra diária de deputados", () => {
  describe("dia da amostra", () => {
    it("mantém o mesmo índice ao longo do dia em Brasília", () => {
      // Arrange
      const manha = new Date("2026-08-21T09:00:00Z");
      const tarde = new Date("2026-08-21T20:00:00Z");

      // Act / Assert
      expect(toDiaIndex(manha)).toBe(toDiaIndex(tarde));
    });

    it("só vira quando o dia vira em Brasília, não em UTC", () => {
      // Arrange
      const noiteDeSexta = new Date("2026-08-21T23:00:00Z");
      const madrugadaDeSabado = new Date("2026-08-22T04:00:00Z");

      // Act
      const sexta = toDiaIndex(noiteDeSexta);
      const sabado = toDiaIndex(madrugadaDeSabado);

      // Assert
      expect(sexta).toBe(toDiaIndex(new Date("2026-08-21T12:00:00Z")));
      expect(sabado).toBe(sexta + 1);
    });
  });

  describe("janela do dia", () => {
    it("avança uma janela inteira a cada dia", () => {
      // Arrange
      const total = 513;
      const tamanho = 3;

      // Act
      const hoje = toOffsetAmostraDiaria(10, total, tamanho);
      const amanha = toOffsetAmostraDiaria(11, total, tamanho);

      // Assert
      expect(hoje).toBe(30);
      expect(amanha).toBe(33);
    });

    it("volta ao começo da lista depois de percorrer a Câmara inteira", () => {
      // Arrange
      const total = 513;
      const tamanho = 3;
      const janelas = 171;

      // Act / Assert
      expect(toOffsetAmostraDiaria(janelas, total, tamanho)).toBe(0);
      expect(toOffsetAmostraDiaria(janelas + 1, total, tamanho)).toBe(3);
    });

    it("recua a última janela para não mostrar menos deputados que as outras", () => {
      // Arrange
      const total = 8;
      const tamanho = 3;

      // Act
      const ultima = toOffsetAmostraDiaria(2, total, tamanho);

      // Assert
      expect(ultima).toBe(5);
    });

    it("fica no começo quando a base tem no máximo o tamanho da amostra", () => {
      // Arrange / Act / Assert
      expect(toOffsetAmostraDiaria(7, 3, 3)).toBe(0);
      expect(toOffsetAmostraDiaria(7, 2, 3)).toBe(0);
    });
  });
});
