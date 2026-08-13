import { deriveJanelaExercicioAno } from '@/exercicio/rules/exercicio-ano';

import { deriveCotaMedianaUf } from './mediana-uf';
import type { GastoCotaAnualDeputado } from './cota-mediana-uf.repository.types';

const janela = deriveJanelaExercicioAno(2024, []);

const anoInteiro = [{ openedAt: '2019-02-01 00:00:00+00', closedAt: null }];
const desdeAgosto = [{ openedAt: '2024-08-01 00:00:00+00', closedAt: null }];

function gasto(
  overrides: Partial<GastoCotaAnualDeputado> = {},
): GastoCotaAnualDeputado {
  return {
    deputadoId: 'deputado-uuid',
    siglaUf: 'MG',
    valorUtilizadoCentavos: 10000,
    intervalos: anoInteiro,
    ...overrides,
  };
}

describe('mediana de gastos da cota por UF', () => {
  describe('when the estado has an odd number of deputados', () => {
    it('takes the middle value and publishes the sample size', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', valorUtilizadoCentavos: 30000 }),
        gasto({ deputadoId: 'b', valorUtilizadoCentavos: 10000 }),
        gasto({ deputadoId: 'c', valorUtilizadoCentavos: 20000 }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas).toEqual([
        {
          year: 2024,
          siglaUf: 'MG',
          valorUtilizadoMedianaCentavos: 20000,
          deputadoCount: 3,
        },
      ]);
    });
  });

  describe('when the estado has an even number of deputados', () => {
    it('averages the two middle values into whole cents', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', valorUtilizadoCentavos: 10000 }),
        gasto({ deputadoId: 'b', valorUtilizadoCentavos: 10001 }),
        gasto({ deputadoId: 'c', valorUtilizadoCentavos: 20000 }),
        gasto({ deputadoId: 'd', valorUtilizadoCentavos: 1 }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas[0]).toMatchObject({
        valorUtilizadoMedianaCentavos: 10001,
        deputadoCount: 4,
      });
    });
  });

  describe('when a deputado exercised only part of the year', () => {
    it('leaves them out of the calculation instead of extrapolating', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', valorUtilizadoCentavos: 30000 }),
        gasto({ deputadoId: 'b', valorUtilizadoCentavos: 20000 }),
        gasto({
          deputadoId: 'c',
          valorUtilizadoCentavos: 100,
          intervalos: desdeAgosto,
        }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas[0]).toMatchObject({
        valorUtilizadoMedianaCentavos: 25000,
        deputadoCount: 2,
      });
    });
  });

  describe('when no deputado of an estado exercised the whole year', () => {
    it('produces no row for that estado', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', siglaUf: 'RR', intervalos: desdeAgosto }),
        gasto({ deputadoId: 'b', siglaUf: 'MG' }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas.map((mediana) => mediana.siglaUf)).toEqual(['MG']);
    });
  });

  describe('when a single deputado of an estado is eligible', () => {
    it('publishes their value with a sample size of one', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', siglaUf: 'AP', valorUtilizadoCentavos: 4242 }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas).toEqual([
        {
          year: 2024,
          siglaUf: 'AP',
          valorUtilizadoMedianaCentavos: 4242,
          deputadoCount: 1,
        },
      ]);
    });
  });

  describe('when a deputado ends the year with a negative total', () => {
    it('lets the negative value take part in the ordering', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', valorUtilizadoCentavos: -5000 }),
        gasto({ deputadoId: 'b', valorUtilizadoCentavos: 10000 }),
        gasto({ deputadoId: 'c', valorUtilizadoCentavos: 30000 }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas[0].valorUtilizadoMedianaCentavos).toBe(10000);
    });

    it('rounds a half cent away from zero', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', valorUtilizadoCentavos: -100 }),
        gasto({ deputadoId: 'b', valorUtilizadoCentavos: -101 }),
      ];

      // Act
      const medianas = deriveCotaMedianaUf({ year: 2024, janela, gastos });

      // Assert
      expect(medianas[0].valorUtilizadoMedianaCentavos).toBe(-101);
    });
  });

  describe('when the same year is calculated again', () => {
    it('produces the same rows regardless of the input order', () => {
      // Arrange
      const gastos = [
        gasto({ deputadoId: 'a', siglaUf: 'SP', valorUtilizadoCentavos: 900 }),
        gasto({ deputadoId: 'b', siglaUf: 'BA', valorUtilizadoCentavos: 700 }),
        gasto({ deputadoId: 'c', siglaUf: 'SP', valorUtilizadoCentavos: 100 }),
      ];

      // Act
      const primeira = deriveCotaMedianaUf({ year: 2024, janela, gastos });
      const segunda = deriveCotaMedianaUf({
        year: 2024,
        janela,
        gastos: [...gastos].reverse(),
      });

      // Assert
      expect(segunda).toEqual(primeira);
      expect(primeira.map((mediana) => mediana.siglaUf)).toEqual(['BA', 'SP']);
    });
  });
});
