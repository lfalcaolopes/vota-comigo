import type { IngestionReporter } from '../../types/ingestion-pipeline-runner.types';

import {
  CATEGORIA_PASSAGEM_AEREA_RPA,
  CATEGORIA_PASSAGEM_AEREA_SIGEPA,
  derivePassagemAereaPorMes,
  logPassagemAereaPorMes,
} from './passagem-aerea-relatorio';
import type { DeputadoGastoCotaRow } from './deputado-gasto-cota.repository.types';

function row(
  overrides: Partial<DeputadoGastoCotaRow> = {},
): DeputadoGastoCotaRow {
  return {
    deputadoId: 'deputado-uuid',
    year: 2025,
    month: 3,
    siglaUf: 'MG',
    externalNumSubCota: CATEGORIA_PASSAGEM_AEREA_SIGEPA,
    descricao: 'PASSAGEM AÉREA - SIGEPA',
    valorUtilizadoCentavos: 10000,
    ...overrides,
  };
}

function createReporter(): IngestionReporter & { readonly lines: string[] } {
  const lines: string[] = [];

  return {
    lines,
    log(message) {
      lines.push(message);
    },
  };
}

describe('derivePassagemAereaPorMes', () => {
  describe('when a month has no line for the categoria', () => {
    it('reports null instead of zero', () => {
      // Arrange
      const rows = [row({ month: 1 })];

      // Act
      const totals = derivePassagemAereaPorMes(
        rows,
        CATEGORIA_PASSAGEM_AEREA_SIGEPA,
      );

      // Assert
      expect(totals[1]).toEqual({
        month: 2,
        totalValorUtilizadoCentavos: null,
      });
    });
  });

  describe('when a month has lines that sum to zero', () => {
    it('reports zero, distinct from a month with no lines', () => {
      // Arrange
      const rows = [
        row({ deputadoId: 'a', month: 8, valorUtilizadoCentavos: 5000 }),
        row({ deputadoId: 'b', month: 8, valorUtilizadoCentavos: -5000 }),
      ];

      // Act
      const totals = derivePassagemAereaPorMes(
        rows,
        CATEGORIA_PASSAGEM_AEREA_SIGEPA,
      );

      // Assert
      expect(totals[7]).toEqual({
        month: 8,
        totalValorUtilizadoCentavos: 0,
      });
    });
  });

  describe('when rows belong to other categorias', () => {
    it('ignores them when summing the requested categoria', () => {
      // Arrange
      const rows = [
        row({ month: 3, externalNumSubCota: 1, valorUtilizadoCentavos: 999 }),
        row({
          month: 3,
          externalNumSubCota: CATEGORIA_PASSAGEM_AEREA_RPA,
          valorUtilizadoCentavos: 4200,
        }),
      ];

      // Act
      const totals = derivePassagemAereaPorMes(
        rows,
        CATEGORIA_PASSAGEM_AEREA_SIGEPA,
      );

      // Assert
      expect(totals[2]).toEqual({
        month: 3,
        totalValorUtilizadoCentavos: null,
      });
    });
  });

  describe('when multiple deputados have lines in the same month', () => {
    it('sums the centavos across deputados', () => {
      // Arrange
      const rows = [
        row({ deputadoId: 'a', month: 5, valorUtilizadoCentavos: 10000 }),
        row({ deputadoId: 'b', month: 5, valorUtilizadoCentavos: 25000 }),
      ];

      // Act
      const totals = derivePassagemAereaPorMes(
        rows,
        CATEGORIA_PASSAGEM_AEREA_SIGEPA,
      );

      // Assert
      expect(totals[4]).toEqual({
        month: 5,
        totalValorUtilizadoCentavos: 35000,
      });
    });
  });
});

describe('logPassagemAereaPorMes', () => {
  describe('when a reporter is configured', () => {
    it('logs one line per categoria distinguishing sem registro from zero', () => {
      // Arrange
      const reporter = createReporter();
      const rows = [
        row({ month: 1, valorUtilizadoCentavos: 123456 }),
        row({
          deputadoId: 'a',
          month: 8,
          valorUtilizadoCentavos: 5000,
        }),
        row({
          deputadoId: 'b',
          month: 8,
          valorUtilizadoCentavos: -5000,
        }),
      ];

      // Act
      logPassagemAereaPorMes(reporter, 'deputado_gasto_cota 2025', rows);

      // Assert
      expect(reporter.lines).toHaveLength(2);
      expect(reporter.lines[0]).toContain('SIGEPA (998)');
      expect(reporter.lines[0]).toContain('jan=R$ 1234.56');
      expect(reporter.lines[0]).toContain('ago=R$ 0.00');
      expect(reporter.lines[0]).toContain('fev=sem registro');
      expect(reporter.lines[1]).toContain('RPA (999)');
    });
  });

  describe('when no reporter is configured', () => {
    it('does nothing', () => {
      // Arrange & Act & Assert
      expect(() =>
        logPassagemAereaPorMes(undefined, 'deputado_gasto_cota 2025', [row()]),
      ).not.toThrow();
    });
  });
});
