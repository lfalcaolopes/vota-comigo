import { checkGastoCotaInvariantes } from './gasto-cota-invariantes';
import type { DeputadoGastoCotaRow } from './deputado-gasto-cota.repository.types';

function row(
  overrides: Partial<DeputadoGastoCotaRow> = {},
): DeputadoGastoCotaRow {
  return {
    deputadoId: 'deputado-uuid',
    year: 2024,
    month: 3,
    externalNumSubCota: 1,
    descricao: 'MANUTENÇÃO DE ESCRITÓRIO',
    valorUtilizadoCentavos: 10000,
    ...overrides,
  };
}

describe('invariantes de soma dos gastos da cota', () => {
  describe('when the aggregates account for every cent read from the file', () => {
    it('closes the three sums', () => {
      // Arrange
      const rows = [
        row({ month: 1, externalNumSubCota: 1, valorUtilizadoCentavos: 10000 }),
        row({ month: 1, externalNumSubCota: 2, valorUtilizadoCentavos: 2500 }),
        row({ month: 2, externalNumSubCota: 1, valorUtilizadoCentavos: -1500 }),
      ];

      // Act
      const result = checkGastoCotaInvariantes({
        rows,
        totalValorUtilizadoCentavos: 11000,
      });

      // Assert
      expect(result).toEqual({ ok: true });
    });
  });

  describe('when the aggregates lose or invent cents', () => {
    it('fails instead of letting the load proceed', () => {
      // Arrange
      const rows = [row({ valorUtilizadoCentavos: 10000 })];

      // Act
      const result = checkGastoCotaInvariantes({
        rows,
        totalValorUtilizadoCentavos: 10001,
      });

      // Assert
      expect(result).toMatchObject({ ok: false });
    });
  });

  describe('when the same deputado, month and categoria appears twice', () => {
    it('fails, because the monthly sum would count it twice', () => {
      // Arrange
      const rows = [
        row({ month: 5, externalNumSubCota: 1, valorUtilizadoCentavos: 700 }),
        row({ month: 5, externalNumSubCota: 1, valorUtilizadoCentavos: 300 }),
      ];

      // Act
      const result = checkGastoCotaInvariantes({
        rows,
        totalValorUtilizadoCentavos: 1000,
      });

      // Assert
      expect(result).toMatchObject({ ok: false });
    });
  });

  describe('when a month falls outside the calendar', () => {
    it('fails, because no monthly axis could hold it', () => {
      // Arrange
      const rows = [row({ month: 13 })];

      // Act
      const result = checkGastoCotaInvariantes({
        rows,
        totalValorUtilizadoCentavos: 10000,
      });

      // Assert
      expect(result).toMatchObject({ ok: false });
    });
  });
});
