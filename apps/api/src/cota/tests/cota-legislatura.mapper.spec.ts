import { toCotaLegislaturaResponse } from '../mappers/cota-legislatura.mapper';
import type { ToCotaLegislaturaResponseInput } from '../mappers/cota-legislatura.mapper';

const LEGISLATURA = {
  legislatura: 57,
  dataInicio: '2023-02-01',
  dataFim: '2027-01-31',
};

function input(
  overrides: Partial<ToCotaLegislaturaResponseInput> = {},
): ToCotaLegislaturaResponseInput {
  return {
    legislatura: LEGISLATURA,
    janela: {
      mesesCobertos: [
        { year: 2023, month: 2 },
        { year: 2023, month: 3 },
      ],
      coberturaAte: '2023-03-31',
    },
    coberturas: [
      {
        year: 2023,
        coveredThroughMonth: 3,
        sigepaReposto: false,
        sigepaCoveredThroughMonth: null,
      },
    ],
    categorias: [
      { externalNumSubCota: 1, description: 'MANUTENCAO DE ESCRITORIO' },
      { externalNumSubCota: 3, description: 'COMBUSTIVEIS E LUBRIFICANTES' },
    ],
    gastos: [
      {
        deputadoId: 'deputado-a',
        year: 2023,
        gastosJson: {
          '2': { '1': 100_000, '3': 30_000 },
          '3': { '1': 50_000 },
        },
      },
      {
        deputadoId: 'deputado-b',
        year: 2023,
        gastosJson: { '2': { '3': 20_000 } },
      },
    ],
    gastosSigepa: [],
    ...overrides,
  };
}

describe('agregado da cota na legislatura', () => {
  describe('quando há gastos na janela coberta', () => {
    it('soma o total de todos os deputados', () => {
      // Arrange
      const source = input();

      // Act
      const result = toCotaLegislaturaResponse(source);

      // Assert
      expect(result.totalAmountUsedCents).toBe(200_000);
    });

    it('discrimina por rubrica, da maior para a menor', () => {
      // Arrange
      const source = input();

      // Act
      const result = toCotaLegislaturaResponse(source);

      // Assert
      expect(result.categories).toEqual([
        {
          externalNumSubCota: 1,
          description: 'MANUTENCAO DE ESCRITORIO',
          amountUsedCents: 150_000,
        },
        {
          externalNumSubCota: 3,
          description: 'COMBUSTIVEIS E LUBRIFICANTES',
          amountUsedCents: 50_000,
        },
      ]);
    });

    it('declara a legislatura, o período e a cobertura vindos do dado', () => {
      // Arrange
      const source = input();

      // Act
      const result = toCotaLegislaturaResponse(source);

      // Assert
      expect(result).toMatchObject({
        legislatura: 57,
        periodStart: '2023-02-01',
        coberturaAte: '2023-03-31',
        deputadoCount: 2,
      });
    });

    it('ignora meses fora da janela coberta', () => {
      // Arrange
      const source = input({
        gastos: [
          {
            deputadoId: 'deputado-a',
            year: 2023,
            gastosJson: { '2': { '1': 100_000 }, '11': { '1': 900_000 } },
          },
        ],
      });

      // Act
      const result = toCotaLegislaturaResponse(source);

      // Assert
      expect(result.totalAmountUsedCents).toBe(100_000);
    });
  });

  describe('quando o ano está reposto', () => {
    it('substitui a passagem aérea SIGEPA do dump pelo valor reposto', () => {
      // Arrange
      const source = input({
        janela: {
          mesesCobertos: [{ year: 2025, month: 8 }],
          coberturaAte: '2025-08-31',
        },
        coberturas: [
          {
            year: 2025,
            coveredThroughMonth: 8,
            sigepaReposto: true,
            sigepaCoveredThroughMonth: 8,
          },
        ],
        categorias: [
          { externalNumSubCota: 1, description: 'MANUTENCAO DE ESCRITORIO' },
          { externalNumSubCota: 998, description: 'PASSAGEM AEREA SIGEPA' },
        ],
        gastos: [
          {
            deputadoId: 'deputado-a',
            year: 2025,
            gastosJson: { '8': { '1': 10_000, '998': -5_000 } },
          },
        ],
        gastosSigepa: [
          { deputadoId: 'deputado-a', year: 2025, gastosJson: { '8': 70_000 } },
        ],
      });

      // Act
      const result = toCotaLegislaturaResponse(source);

      // Assert
      expect(result.totalAmountUsedCents).toBe(80_000);
    });

    it('conta o deputado cujo único gasto do mês veio da reposição', () => {
      // Arrange
      const source = input({
        janela: {
          mesesCobertos: [{ year: 2025, month: 8 }],
          coberturaAte: '2025-08-31',
        },
        coberturas: [
          {
            year: 2025,
            coveredThroughMonth: 8,
            sigepaReposto: true,
            sigepaCoveredThroughMonth: 8,
          },
        ],
        categorias: [
          { externalNumSubCota: 998, description: 'PASSAGEM AEREA SIGEPA' },
        ],
        gastos: [],
        gastosSigepa: [
          { deputadoId: 'deputado-a', year: 2025, gastosJson: { '8': 70_000 } },
          { deputadoId: 'deputado-b', year: 2025, gastosJson: {} },
        ],
      });

      // Act
      const result = toCotaLegislaturaResponse(source);

      // Assert
      expect(result).toMatchObject({
        deputadoCount: 1,
        totalAmountUsedCents: 70_000,
      });
    });
  });

  describe('quando a rubrica não está no catálogo de categorias', () => {
    it('interrompe em vez de publicar uma rubrica sem nome', () => {
      // Arrange
      const source = input({
        gastos: [
          {
            deputadoId: 'deputado-a',
            year: 2023,
            gastosJson: { '2': { '77': 10_000 } },
          },
        ],
      });

      // Act
      const act = () => toCotaLegislaturaResponse(source);

      // Assert
      expect(act).toThrow('categoria da cota 77 não encontrada');
    });
  });
});
