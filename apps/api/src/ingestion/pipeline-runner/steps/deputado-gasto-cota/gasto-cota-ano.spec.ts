import { sumGastoCotaAno, toDeputadoGastoCotaAnoRows } from './gasto-cota-ano';
import type { DeputadoGastoCotaRow } from './deputado-gasto-cota.repository.types';

function row(
  overrides: Partial<DeputadoGastoCotaRow> = {},
): DeputadoGastoCotaRow {
  return {
    deputadoId: 'deputado-uuid',
    year: 2024,
    siglaUf: 'MG',
    month: 3,
    externalNumSubCota: 1,
    descricao: 'MANUTENÇÃO DE ESCRITÓRIO',
    valorUtilizadoCentavos: 10000,
    ...overrides,
  };
}

describe('gastos da cota agrupados por deputado e ano', () => {
  describe('when a deputado spent across months and categorias', () => {
    it('collapses the aggregates into a single row keyed by month and categoria', () => {
      // Arrange
      const rows = [
        row({ month: 3, externalNumSubCota: 1, valorUtilizadoCentavos: 10000 }),
        row({ month: 3, externalNumSubCota: 4, valorUtilizadoCentavos: 2500 }),
        row({ month: 7, externalNumSubCota: 1, valorUtilizadoCentavos: 900 }),
      ];

      // Act
      const anoRows = toDeputadoGastoCotaAnoRows(rows);

      // Assert
      expect(anoRows).toEqual([
        {
          deputadoId: 'deputado-uuid',
          year: 2024,
          siglaUf: 'MG',
          gastosJson: {
            '3': { '1': 10000, '4': 2500 },
            '7': { '1': 900 },
          },
        },
      ]);
    });
  });

  describe('when several deputados appear in the same year', () => {
    it('keeps one row per deputado', () => {
      // Arrange
      const rows = [
        row({ deputadoId: 'a' }),
        row({ deputadoId: 'b', month: 5 }),
        row({ deputadoId: 'a', month: 9 }),
      ];

      // Act
      const anoRows = toDeputadoGastoCotaAnoRows(rows);

      // Assert
      expect(anoRows.map((anoRow) => anoRow.deputadoId)).toEqual(['a', 'b']);
      expect(anoRows[0].gastosJson).toEqual({
        '3': { '1': 10000 },
        '9': { '1': 10000 },
      });
    });
  });

  describe('when an aggregate is negative', () => {
    it('carries the negative cents into the json', () => {
      // Arrange
      const rows = [row({ valorUtilizadoCentavos: -114870 })];

      // Act
      const anoRows = toDeputadoGastoCotaAnoRows(rows);

      // Assert
      expect(anoRows[0].gastosJson['3']['1']).toBe(-114870);
    });
  });

  describe('when the annual total of a deputado is needed', () => {
    it('sums every month and categoria of the json', () => {
      // Arrange
      const [anoRow] = toDeputadoGastoCotaAnoRows([
        row({ month: 3, externalNumSubCota: 1, valorUtilizadoCentavos: 10000 }),
        row({ month: 3, externalNumSubCota: 4, valorUtilizadoCentavos: 2500 }),
        row({ month: 7, externalNumSubCota: 1, valorUtilizadoCentavos: 900 }),
      ]);

      // Act
      const total = sumGastoCotaAno(anoRow.gastosJson);

      // Assert
      expect(total).toBe(13400);
    });

    it('lets negative aggregates reduce the total', () => {
      // Arrange
      const [anoRow] = toDeputadoGastoCotaAnoRows([
        row({ month: 1, valorUtilizadoCentavos: 10000 }),
        row({ month: 2, valorUtilizadoCentavos: -114870 }),
      ]);

      // Act
      const total = sumGastoCotaAno(anoRow.gastosJson);

      // Assert
      expect(total).toBe(-104870);
    });

    it('is zero for a deputado with an empty year', () => {
      // Arrange
      const gastosJson = {};

      // Act
      const total = sumGastoCotaAno(gastosJson);

      // Assert
      expect(total).toBe(0);
    });
  });

  describe('when the cents are read back from the json', () => {
    it('survives a serialization round trip without losing a cent', () => {
      // Arrange
      const rows = [
        row({ month: 1, valorUtilizadoCentavos: 5847470 }),
        row({ month: 2, valorUtilizadoCentavos: -1 }),
        row({ month: 12, valorUtilizadoCentavos: 999999999 }),
      ];

      // Act
      const anoRows = toDeputadoGastoCotaAnoRows(rows);
      const roundTripped: unknown = JSON.parse(
        JSON.stringify(anoRows[0].gastosJson),
      );

      // Assert
      expect(roundTripped).toEqual(anoRows[0].gastosJson);
    });
  });
});
