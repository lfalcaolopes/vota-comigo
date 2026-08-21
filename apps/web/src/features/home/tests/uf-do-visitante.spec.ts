import { describe, expect, it } from "vitest";

import { toUfDoVisitante } from "../lib/uf-do-visitante";

const UFS_VALIDAS = ["DF", "PE", "SP"] as const;

describe("estado do visitante", () => {
  describe("acesso de dentro do Brasil", () => {
    it("usa a sigla que a borda identificou", () => {
      // Arrange / Act
      const uf = toUfDoVisitante("BR", "PE", UFS_VALIDAS);

      // Assert
      expect(uf).toBe("PE");
    });

    it("aceita a sigla em caixa baixa", () => {
      // Arrange / Act
      const uf = toUfDoVisitante("BR", "sp", UFS_VALIDAS);

      // Assert
      expect(uf).toBe("SP");
    });

    it("descarta sigla que não existe na lista da Câmara", () => {
      // Arrange / Act
      const uf = toUfDoVisitante("BR", "XX", UFS_VALIDAS);

      // Assert
      expect(uf).toBeNull();
    });
  });

  describe("acesso sem estado identificado", () => {
    it("cai no recorte nacional quando o acesso vem de fora do Brasil", () => {
      // Arrange / Act
      const uf = toUfDoVisitante("US", "CA", UFS_VALIDAS);

      // Assert
      expect(uf).toBeNull();
    });

    it("cai no recorte nacional quando os cabeçalhos não existem", () => {
      // Arrange / Act
      const uf = toUfDoVisitante(null, null, UFS_VALIDAS);

      // Assert
      expect(uf).toBeNull();
    });

    it("cai no recorte nacional quando o país veio sem o estado", () => {
      // Arrange / Act
      const uf = toUfDoVisitante("BR", null, UFS_VALIDAS);

      // Assert
      expect(uf).toBeNull();
    });
  });
});
