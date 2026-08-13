import {
  deriveJanelaExercicioAno,
  exerceuAnoInteiro,
} from '../rules/exercicio-ano';

describe('janela de exercicio de um ano', () => {
  describe('when no legislatura starts inside the year', () => {
    it('spans the whole calendar year', () => {
      // Arrange
      const inicios = ['2023-02-01', '2027-02-01'];

      // Act
      const janela = deriveJanelaExercicioAno(2024, inicios);

      // Assert
      expect(janela).toEqual({
        inicio: '2024-01-01T00:00:00.000Z',
        fim: '2025-01-01T00:00:00.000Z',
      });
    });
  });

  describe('when a legislatura starts inside the year', () => {
    it('opens at the end of the posse day, since the posse happens mid-day', () => {
      // Arrange
      const inicios = ['2019-02-01', '2023-02-01'];

      // Act
      const janela = deriveJanelaExercicioAno(2023, inicios);

      // Assert
      expect(janela.inicio).toBe('2023-02-02T00:00:00.000Z');
    });
  });
});

describe('exercicio de ano inteiro', () => {
  const janela2024 = deriveJanelaExercicioAno(2024, []);

  describe('when a single intervalo covers the whole window', () => {
    it('counts as a full year of exercise', () => {
      // Arrange
      const intervalos = [
        { openedAt: '2023-02-01 00:00:00+00', closedAt: null },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(true);
    });
  });

  describe('when the deputado took office in the middle of the year', () => {
    it('does not count as a full year of exercise', () => {
      // Arrange
      const intervalos = [
        { openedAt: '2024-08-01 00:00:00+00', closedAt: null },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(false);
    });
  });

  describe('when the deputado left before the end of the year', () => {
    it('does not count as a full year of exercise', () => {
      // Arrange
      const intervalos = [
        {
          openedAt: '2023-02-01 00:00:00+00',
          closedAt: '2024-10-15 00:00:00+00',
        },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(false);
    });
  });

  describe('when two intervalos meet without a gap', () => {
    it('counts the union as a full year of exercise', () => {
      // Arrange
      const intervalos = [
        {
          openedAt: '2023-02-01 00:00:00+00',
          closedAt: '2024-06-01 00:00:00+00',
        },
        { openedAt: '2024-06-01 00:00:00+00', closedAt: null },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(true);
    });
  });

  describe('when the deputado was away between two intervalos', () => {
    it('does not count as a full year of exercise', () => {
      // Arrange
      const intervalos = [
        {
          openedAt: '2023-02-01 00:00:00+00',
          closedAt: '2024-06-01 00:00:00+00',
        },
        { openedAt: '2024-09-01 00:00:00+00', closedAt: null },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(false);
    });
  });

  describe('when the deputado took office at the posse session', () => {
    it('counts as a full year in the year the legislatura starts', () => {
      // Arrange
      const janela2023 = deriveJanelaExercicioAno(2023, ['2023-02-01']);
      const intervalos = [
        { openedAt: '2023-02-01 12:05:00+00', closedAt: null },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2023);

      // Assert
      expect(inteiro).toBe(true);
    });
  });

  describe('when the deputado took office days after the posse session', () => {
    it('does not count as a full year in the year the legislatura starts', () => {
      // Arrange
      const janela2023 = deriveJanelaExercicioAno(2023, ['2023-02-01']);
      const intervalos = [
        { openedAt: '2023-02-03 10:46:00+00', closedAt: null },
      ];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2023);

      // Assert
      expect(inteiro).toBe(false);
    });
  });

  describe('when the deputado has no intervalo at all', () => {
    it('does not count as a full year of exercise', () => {
      // Arrange
      const intervalos: { openedAt: string; closedAt: string | null }[] = [];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(false);
    });
  });

  describe('when an intervalo carries an unreadable instant', () => {
    it('does not let the unreadable boundary fill the window', () => {
      // Arrange
      const intervalos = [{ openedAt: 'sem data', closedAt: null }];

      // Act
      const inteiro = exerceuAnoInteiro(intervalos, janela2024);

      // Assert
      expect(inteiro).toBe(false);
    });
  });
});
