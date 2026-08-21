import type { UsoCotaCobertura } from '@/shared/cota/uso-cota';

import {
  deriveJanelaCotaLegislatura,
  type DeriveJanelaCotaLegislaturaInput,
} from '../rules/janela-cota-legislatura';

function cobertura(
  year: number,
  coveredThroughMonth: number,
  overrides: Partial<UsoCotaCobertura> = {},
): UsoCotaCobertura {
  return {
    year,
    coveredThroughMonth,
    sigepaReposto: false,
    sigepaCoveredThroughMonth: null,
    ...overrides,
  };
}

function input(
  overrides: Partial<DeriveJanelaCotaLegislaturaInput> = {},
): DeriveJanelaCotaLegislaturaInput {
  return {
    legislatura: {
      legislatura: 57,
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
    coberturas: [cobertura(2023, 12), cobertura(2024, 4)],
    referencia: '2024-04-30',
    ...overrides,
  };
}

describe('janela coberta do agregado da cota', () => {
  describe('quando a cobertura acompanha a janela', () => {
    it('vai do início da legislatura ao último mês carregado', () => {
      // Arrange
      const source = input();

      // Act
      const result = deriveJanelaCotaLegislatura(source);

      // Assert
      expect(result?.coberturaAte).toBe('2024-04-30');
      expect(result?.mesesCobertos).toHaveLength(15);
      expect(result?.mesesCobertos.at(0)).toEqual({ year: 2023, month: 2 });
      expect(result?.mesesCobertos.at(-1)).toEqual({ year: 2024, month: 4 });
    });

    it('para no fim da legislatura encerrada, não na referência', () => {
      // Arrange
      const source = input({
        legislatura: {
          legislatura: 56,
          dataInicio: '2019-02-01',
          dataFim: '2023-01-31',
        },
        coberturas: [
          cobertura(2019, 12),
          cobertura(2020, 12),
          cobertura(2021, 12),
          cobertura(2022, 12),
          cobertura(2023, 12),
        ],
        referencia: '2026-08-20',
      });

      // Act
      const result = deriveJanelaCotaLegislatura(source);

      // Assert
      expect(result?.coberturaAte).toBe('2023-01-31');
      expect(result?.mesesCobertos).toHaveLength(48);
    });
  });

  describe('quando a cobertura tem buraco no meio da janela', () => {
    it('não devolve janela', () => {
      // Arrange
      const source = input({
        coberturas: [cobertura(2023, 6), cobertura(2024, 4)],
      });

      // Act
      const result = deriveJanelaCotaLegislatura(source);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('quando nenhum mês da janela foi carregado', () => {
    it('não devolve janela', () => {
      // Arrange
      const source = input({ coberturas: [cobertura(2019, 12)] });

      // Act
      const result = deriveJanelaCotaLegislatura(source);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('quando um ano da janela ainda não teve a passagem aérea SIGEPA reposta', () => {
    it('encerra a janela no mês anterior à lacuna, em vez de somar um total menor', () => {
      // Arrange
      const source = input({
        coberturas: [
          cobertura(2023, 12),
          cobertura(2024, 12),
          cobertura(2025, 12),
        ],
        referencia: '2025-12-31',
      });

      // Act
      const result = deriveJanelaCotaLegislatura(source);

      // Assert
      expect(result?.coberturaAte).toBe('2025-07-31');
    });

    it('vai até o fim quando o ano está reposto', () => {
      // Arrange
      const source = input({
        coberturas: [
          cobertura(2023, 12),
          cobertura(2024, 12),
          cobertura(2025, 12, {
            sigepaReposto: true,
            sigepaCoveredThroughMonth: 12,
          }),
        ],
        referencia: '2025-12-31',
      });

      // Act
      const result = deriveJanelaCotaLegislatura(source);

      // Assert
      expect(result?.coberturaAte).toBe('2025-12-31');
    });
  });
});
