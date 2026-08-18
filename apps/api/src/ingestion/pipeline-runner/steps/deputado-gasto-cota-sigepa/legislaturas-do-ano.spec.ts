import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import {
  deriveLegislaturasNoAno,
  type LegislaturaPeriodo,
} from './legislaturas-do-ano';

const LEGISLATURA_56: LegislaturaPeriodo = {
  externalIdLegislatura: 56,
  dataInicio: '2019-02-01',
  dataFim: '2023-01-31',
};

const LEGISLATURA_57: LegislaturaPeriodo = {
  externalIdLegislatura: 57,
  dataInicio: '2023-02-01',
  dataFim: '2027-01-31',
};

const LEGISLATURAS = [LEGISLATURA_56, LEGISLATURA_57];

function intervalo(openedAt: string, closedAt: string | null = null) {
  return { openedAt, closedAt } satisfies IntervaloExercicio;
}

describe('legislaturas a consultar no ano', () => {
  describe('when the exercicio stays inside a single legislatura', () => {
    it('derives only that legislatura', () => {
      // Arrange
      const intervalos = [intervalo('2024-01-01T00:00:00Z')];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2024, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([57]);
    });
  });

  describe('when the year contains a change of legislatura', () => {
    it('derives both legislaturas for an exercicio that crosses it', () => {
      // Arrange
      const intervalos = [intervalo('2022-05-01T00:00:00Z')];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2023, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([56, 57]);
    });

    it('derives only the previous legislatura for an exercicio that ends before the change', () => {
      // Arrange
      const intervalos = [
        intervalo('2022-05-01T00:00:00Z', '2023-01-31T18:00:00Z'),
      ];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2023, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([56]);
    });

    it('derives both legislaturas from separate intervalos on each side', () => {
      // Arrange
      const intervalos = [
        intervalo('2023-02-01T12:00:00Z', '2023-04-30T00:00:00Z'),
        intervalo('2022-03-01T00:00:00Z', '2023-01-10T00:00:00Z'),
      ];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2023, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([56, 57]);
    });
  });

  describe('when the exercicio does not touch the year', () => {
    it('derives no legislatura', () => {
      // Arrange
      const intervalos = [
        intervalo('2019-02-01T00:00:00Z', '2021-12-31T00:00:00Z'),
      ];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2024, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([]);
    });

    it('derives no legislatura from an intervalo that closes on the first instant of the year', () => {
      // Arrange
      const intervalos = [
        intervalo('2023-02-01T00:00:00Z', '2024-01-01T00:00:00Z'),
      ];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2024, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([]);
    });
  });

  describe('when the same legislatura is reachable more than once', () => {
    it('derives it a single time, in ascending order', () => {
      // Arrange
      const intervalos = [
        intervalo('2024-06-01T00:00:00Z', '2024-07-01T00:00:00Z'),
        intervalo('2024-09-01T00:00:00Z', '2024-10-01T00:00:00Z'),
      ];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2024, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([57]);
    });
  });

  describe('when a legislatura has no recorded end', () => {
    it('treats it as still open instead of dropping it', () => {
      // Arrange
      const legislaturas = [
        { ...LEGISLATURA_57, dataFim: null },
      ] satisfies LegislaturaPeriodo[];
      const intervalos = [intervalo('2030-01-01T00:00:00Z')];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2030, legislaturas);

      // Assert
      expect(derived).toEqual([57]);
    });
  });

  describe('when an intervalo has an unreadable boundary', () => {
    it('ignores the intervalo instead of covering the whole year', () => {
      // Arrange
      const intervalos = [intervalo('data invalida', '2024-06-01T00:00:00Z')];

      // Act
      const derived = deriveLegislaturasNoAno(intervalos, 2024, LEGISLATURAS);

      // Assert
      expect(derived).toEqual([]);
    });
  });
});
