import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { isEmExercicioNoAno } from './exercicio-no-ano';

function intervalo(openedAt: string, closedAt: string | null = null) {
  return { openedAt, closedAt } satisfies IntervaloExercicio;
}

describe('exercicio dentro do ano', () => {
  describe('when an intervalo covers part of the year', () => {
    it('recognizes the deputado as em exercicio in that year', () => {
      // Arrange
      const intervalos = [
        intervalo('2025-08-01T00:00:00Z', '2025-08-02T00:00:00Z'),
      ];

      // Act
      const emExercicio = isEmExercicioNoAno(intervalos, 2025);

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when an intervalo is still open', () => {
    it('recognizes every year from its opening onwards', () => {
      // Arrange
      const intervalos = [intervalo('2023-02-01T12:00:00Z')];

      // Act / Assert
      expect(isEmExercicioNoAno(intervalos, 2022)).toBe(false);
      expect(isEmExercicioNoAno(intervalos, 2023)).toBe(true);
      expect(isEmExercicioNoAno(intervalos, 2026)).toBe(true);
    });
  });

  describe('when the intervalos fall outside the year', () => {
    it('does not recognize the deputado as em exercicio', () => {
      // Arrange
      const intervalos = [
        intervalo('2019-02-01T00:00:00Z', '2023-01-31T00:00:00Z'),
      ];

      // Act
      const emExercicio = isEmExercicioNoAno(intervalos, 2025);

      // Assert
      expect(emExercicio).toBe(false);
    });

    it('does not recognize an intervalo that closes on the first instant of the year', () => {
      // Arrange
      const intervalos = [
        intervalo('2024-02-01T00:00:00Z', '2025-01-01T00:00:00Z'),
      ];

      // Act
      const emExercicio = isEmExercicioNoAno(intervalos, 2025);

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when an intervalo has an unreadable boundary', () => {
    it('ignores the intervalo instead of covering the whole year', () => {
      // Arrange
      const intervalos = [intervalo('data invalida', '2025-06-01T00:00:00Z')];

      // Act
      const emExercicio = isEmExercicioNoAno(intervalos, 2025);

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when the deputado has no intervalo at all', () => {
    it('does not recognize the deputado as em exercicio', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [];

      // Act
      const emExercicio = isEmExercicioNoAno(intervalos, 2025);

      // Assert
      expect(emExercicio).toBe(false);
    });
  });
});
