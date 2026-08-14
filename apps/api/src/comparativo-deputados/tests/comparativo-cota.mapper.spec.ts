import type { DeputadoCeapSource } from '@/deputados/types/deputados.types';

import { toComparativoCota } from '../mappers/comparativo-cota.mapper';

const validYearRange = { startYear: 2023, endYear: 2025 };

function ceapSource(overrides: Partial<DeputadoCeapSource> = {}) {
  return {
    coberturas: [{ year: 2024, coveredThroughMonth: 12 }],
    gasto: {
      siglaUf: 'MG',
      gastosJson: { '1': { '1': 100_000 } },
    },
    categorias: [{ externalNumSubCota: 1, description: 'PASSAGENS AÉREAS' }],
    medianaUf: { amountUsedCents: 200_000, deputadoCount: 53 },
    intervalosExercicio: [
      { openedAt: '2019-02-01T00:00:00.000Z', closedAt: null },
    ],
    datasInicioLegislatura: ['2023-02-01T00:00:00.000Z'],
    ...overrides,
  } satisfies DeputadoCeapSource;
}

describe('projeção da cota para o comparativo', () => {
  describe('quando o ano tem exercício completo e mediana', () => {
    it('publica a posição frente à mediana da UF, não o valor gasto', () => {
      // Arrange
      const source = ceapSource();

      // Act
      const cota = toComparativoCota({
        year: 2024,
        validYearRange,
        source,
      });

      // Assert
      expect(cota).toEqual({
        status: 'comparavel',
        percentualSobreMedianaUf: 50,
        medianaUf: { siglaUf: 'MG', deputadoCount: 53 },
      });
    });
  });

  describe('quando o ano ainda não foi carregado', () => {
    it('declara o ano não carregado', () => {
      // Arrange
      const source = ceapSource({ coberturas: [] });

      // Act
      const cota = toComparativoCota({ year: 2024, validYearRange, source });

      // Assert
      expect(cota).toEqual({ status: 'ano-nao-carregado' });
    });
  });

  describe('quando o deputado não exerceu o ano inteiro', () => {
    it('não compara e declara o exercício parcial', () => {
      // Arrange
      const source = ceapSource({
        intervalosExercicio: [
          { openedAt: '2024-06-01T00:00:00.000Z', closedAt: null },
        ],
      });

      // Act
      const cota = toComparativoCota({ year: 2024, validYearRange, source });

      // Assert
      expect(cota).toEqual({
        status: 'sem-comparacao',
        motivo: 'exercicio-parcial',
      });
    });
  });

  describe('quando a fonte da cota está incompleta no ano', () => {
    it('não compara e declara o dado incompleto', () => {
      // Arrange
      const source = ceapSource({
        coberturas: [{ year: 2026, coveredThroughMonth: 3 }],
      });

      // Act
      const cota = toComparativoCota({
        year: 2026,
        validYearRange: { startYear: 2023, endYear: 2026 },
        source,
      });

      // Assert
      expect(cota).toEqual({
        status: 'sem-comparacao',
        motivo: 'dado-incompleto',
      });
    });
  });

  describe('quando o deputado não tem gasto no ano', () => {
    it('não compara e declara a ausência de gastos', () => {
      // Arrange
      const source = ceapSource({ gasto: null, medianaUf: null });

      // Act
      const cota = toComparativoCota({ year: 2024, validYearRange, source });

      // Assert
      expect(cota).toEqual({ status: 'sem-comparacao', motivo: 'sem-gastos' });
    });
  });

  describe('quando a mediana da UF não é uma base utilizável', () => {
    it('não compara contra mediana zerada', () => {
      // Arrange
      const source = ceapSource({
        medianaUf: { amountUsedCents: 0, deputadoCount: 53 },
      });

      // Act
      const cota = toComparativoCota({ year: 2024, validYearRange, source });

      // Assert
      expect(cota).toEqual({
        status: 'sem-comparacao',
        motivo: 'dado-incompleto',
      });
    });
  });
});
