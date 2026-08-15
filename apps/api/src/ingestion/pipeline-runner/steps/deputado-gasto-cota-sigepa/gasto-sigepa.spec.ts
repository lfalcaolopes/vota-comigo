import type { DespesaCota } from './deputado-gasto-cota-sigepa.repository.types';
import {
  DESCRICAO_PASSAGEM_AEREA_SIGEPA,
  aggregateGastosSigepa,
} from './gasto-sigepa';

function despesa(overrides: Partial<DespesaCota> = {}): DespesaCota {
  return {
    ano: 2025,
    mes: 8,
    tipoDespesa: DESCRICAO_PASSAGEM_AEREA_SIGEPA,
    valorLiquido: 1171.23,
    ...overrides,
  };
}

function aggregate(despesas: readonly DespesaCota[], year = 2025) {
  return aggregateGastosSigepa({
    despesas,
    year,
    externalIdDeputado: 220593,
    sourceFile: 'api/deputados/despesas',
  });
}

describe('gasto de passagem aérea SIGEPA reposto', () => {
  describe('when the despesa belongs to the SIGEPA category', () => {
    it('converts valorLiquido into centavos under its month', () => {
      // Arrange
      const despesas = [despesa()];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.gastosJson).toEqual({ '8': 117123 });
      expect(result.fatal).toBeNull();
      expect(result.rejected).toEqual([]);
      expect(result.read).toBe(1);
      expect(result.ignored).toBe(0);
    });

    it('sums every despesa of the same month', () => {
      // Arrange
      const despesas = [
        despesa({ valorLiquido: 1171.23 }),
        despesa({ valorLiquido: 100.5 }),
        despesa({ mes: 9, valorLiquido: 10 }),
      ];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.gastosJson).toEqual({ '8': 127173, '9': 1000 });
    });

    it('rounds to the nearest centavo', () => {
      // Arrange
      const despesas = [despesa({ valorLiquido: 0.1 + 0.2 })];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.gastosJson).toEqual({ '8': 30 });
    });

    it('preserves a negative valorLiquido instead of zeroing the estorno', () => {
      // Arrange
      const despesas = [
        despesa({ valorLiquido: 800 }),
        despesa({ valorLiquido: -1171.23 }),
      ];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.gastosJson).toEqual({ '8': -37123 });
    });

    it('keeps a month whose despesas cancel out as zero', () => {
      // Arrange
      const despesas = [
        despesa({ valorLiquido: 800 }),
        despesa({ valorLiquido: -800 }),
      ];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.gastosJson).toEqual({ '8': 0 });
    });
  });

  describe('when the despesa belongs to another category', () => {
    it('discards it without rejecting', () => {
      // Arrange
      const despesas = [
        despesa({ tipoDespesa: 'PASSAGEM AÉREA - RPA' }),
        despesa({ tipoDespesa: 'TELEFONIA', mes: 3 }),
        despesa(),
      ];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.gastosJson).toEqual({ '8': 117123 });
      expect(result.ignored).toBe(2);
      expect(result.rejected).toEqual([]);
      expect(result.fatal).toBeNull();
    });
  });

  describe('when the SIGEPA description diverges from the known one', () => {
    it('aborts the year instead of taking it as a new category', () => {
      // Arrange
      const despesas = [
        despesa(),
        despesa({ tipoDespesa: 'PASSAGEM AEREA — SIGEPA' }),
      ];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.fatal).toMatchObject({
        type: 'descricao_conflitante',
        fields: {
          externalIdDeputado: '220593',
          tipoDespesa: 'PASSAGEM AEREA — SIGEPA',
          descricaoConhecida: DESCRICAO_PASSAGEM_AEREA_SIGEPA,
        },
      });
      expect(result.gastosJson).toEqual({});
    });
  });

  describe('when a SIGEPA despesa carries unusable fields', () => {
    it('rejects a month outside 1..12', () => {
      // Arrange
      const despesas = [despesa({ mes: 0 }), despesa()];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        type: 'mes_invalido',
        fields: { mes: '0' },
      });
      expect(result.gastosJson).toEqual({ '8': 117123 });
    });

    it('rejects a despesa from another year', () => {
      // Arrange
      const despesas = [despesa({ ano: 2024 })];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        type: 'ano_divergente',
        fields: { ano: '2024' },
      });
      expect(result.gastosJson).toEqual({});
    });

    it('rejects a valorLiquido that is not a finite number', () => {
      // Arrange
      const despesas = [despesa({ valorLiquido: null })];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({ type: 'valor_invalido' });
      expect(result.gastosJson).toEqual({});
    });
  });

  describe('when the deputado has no despesa at all', () => {
    it('produces an empty result, which is a legitimate outcome', () => {
      // Arrange
      const despesas: readonly DespesaCota[] = [];

      // Act
      const result = aggregate(despesas);

      // Assert
      expect(result).toMatchObject({
        gastosJson: {},
        fatal: null,
        read: 0,
        ignored: 0,
      });
    });
  });
});
