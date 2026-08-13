import { deriveGruposGastoCota } from '../rules/grupos-gasto-cota';

describe('grupos de apresentação dos gastos da cota', () => {
  describe('when the deputado spent in a single categoria', () => {
    it('derives one grupo with the annual total and the twelve months', () => {
      // Arrange
      const gastosJson = {
        '3': { '1': 10000 },
        '7': { '1': 2500 },
      };

      // Act
      const grupos = deriveGruposGastoCota(gastosJson);

      // Assert
      expect(grupos).toEqual([
        {
          externalNumSubCota: 1,
          anualCentavos: 12500,
          mensalCentavos: [0, 0, 10000, 0, 0, 0, 2500, 0, 0, 0, 0, 0],
        },
      ]);
    });
  });

  describe('when the deputado spent in more than five categorias', () => {
    it('keeps the five largest of the year and collapses the rest into outras despesas', () => {
      // Arrange
      const gastosJson = {
        '1': {
          '1': 90000,
          '2': 80000,
          '3': 70000,
          '4': 60000,
          '5': 50000,
          '6': 4000,
          '7': 300,
        },
      };

      // Act
      const grupos = deriveGruposGastoCota(gastosJson);

      // Assert
      expect(
        grupos.map(({ externalNumSubCota, anualCentavos }) => [
          externalNumSubCota,
          anualCentavos,
        ]),
      ).toEqual([
        [1, 90000],
        [2, 80000],
        [3, 70000],
        [4, 60000],
        [5, 50000],
        [null, 4300],
      ]);
    });
  });

  describe('when categorias tie on the annual total', () => {
    it('breaks the tie by numSubCota so the cut is deterministic', () => {
      // Arrange
      const gastosJson = {
        '1': { '9': 1000, '2': 1000, '7': 1000, '4': 1000, '11': 1000 },
        '2': { '3': 1000 },
      };

      // Act
      const grupos = deriveGruposGastoCota(gastosJson);

      // Assert
      expect(grupos.map((grupo) => grupo.externalNumSubCota)).toEqual([
        2,
        3,
        4,
        7,
        9,
        null,
      ]);
    });
  });

  describe('when the deputado spent in exactly five categorias', () => {
    it('derives no outras despesas grupo', () => {
      // Arrange
      const gastosJson = {
        '1': { '1': 500, '2': 400, '3': 300, '4': 200, '5': 100 },
      };

      // Act
      const grupos = deriveGruposGastoCota(gastosJson);

      // Assert
      expect(grupos.map((grupo) => grupo.externalNumSubCota)).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });
  });

  describe('when a categoria has a negative aggregate', () => {
    it('keeps the negative in the ranking and in outras despesas', () => {
      // Arrange
      const gastosJson = {
        '1': {
          '1': 90000,
          '2': 80000,
          '3': 70000,
          '4': 60000,
          '5': 50000,
          '6': -4000,
        },
        '2': { '6': 1000 },
      };

      // Act
      const grupos = deriveGruposGastoCota(gastosJson);

      // Assert
      expect(grupos.at(-1)).toEqual({
        externalNumSubCota: null,
        anualCentavos: -3000,
        mensalCentavos: [-4000, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      });
    });
  });
});
