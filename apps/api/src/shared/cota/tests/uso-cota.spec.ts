import { deriveUsoCota, type DeriveUsoCotaInput } from '../uso-cota';

const TETO_MG_2023 = 4_188_651;

function input(
  overrides: Partial<DeriveUsoCotaInput> = {},
): DeriveUsoCotaInput {
  return {
    externalIdDeputado: 1,
    intervalosExercicio: [{ openedAt: '2023-02-01', closedAt: null }],
    legislaturas: [
      { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
    ],
    coberturas: [
      {
        year: 2023,
        coveredThroughMonth: 4,
        sigepaReposto: false,
        sigepaCoveredThroughMonth: null,
      },
    ],
    gastos: [
      {
        year: 2023,
        gastosJson: { '2': { '1': 100_000 }, '4': { '1': 200_000 } },
        gastosSigepaJson: null,
      },
    ],
    ufs: [{ dataInicio: '2023-02-01', dataFim: null, siglaUf: 'MG' }],
    referencia: '2023-04-30',
    ...overrides,
  };
}

describe('uso da cota sobre o teto-base', () => {
  describe('quando a janela está coberta', () => {
    it('ignora legislatura futura para intervalo de exercício aberto', () => {
      // Arrange
      const source = input({
        legislaturas: [
          { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
          { legislatura: 58, dataInicio: '2027-02-01', dataFim: '2031-01-31' },
        ],
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toMatchObject({ status: 'calculavel', legislatura: 57 });
    });

    it('soma competências e tetos mensais até o mesmo último mês', () => {
      // Arrange
      const source = input();

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toEqual({
        status: 'calculavel',
        legislatura: 57,
        percentualTetoBase: (300_000 * 100) / (TETO_MG_2023 * 3),
        periodStart: '2023-02-01',
        diasEmExercicio: 89,
        gastoCents: 300_000,
        tetoBaseCents: TETO_MG_2023 * 3,
        coberturaAte: '2023-04-30',
      });
    });

    it('conta uma vez o mês tocado por intervalos duplicados', () => {
      // Arrange
      const source = input({
        intervalosExercicio: [
          { openedAt: '2023-02-01', closedAt: '2023-02-15' },
          { openedAt: '2023-02-10', closedAt: '2023-02-28' },
        ],
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result.tetoBaseCents).toBe(TETO_MG_2023);
      expect(result.diasEmExercicio).toBe(27);
    });

    it('inclui ajustes em competência sem exercício', () => {
      // Arrange
      const source = input({
        intervalosExercicio: [
          { openedAt: '2023-02-01', closedAt: '2023-02-28' },
        ],
        gastos: [
          {
            year: 2023,
            gastosJson: { '2': { '1': 100_000 }, '4': { '1': -250_000 } },
            gastosSigepaJson: null,
          },
        ],
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result.gastoCents).toBe(-150_000);
      expect(
        result.status === 'calculavel' && result.percentualTetoBase,
      ).toBeLessThan(0);
    });

    it('preserva zero e percentual acima de cem', () => {
      // Arrange
      const zero = input({ gastos: [] });
      const acima = input({
        gastos: [
          {
            year: 2023,
            gastosJson: { '2': { '1': TETO_MG_2023 * 4 } },
            gastosSigepaJson: null,
          },
        ],
      });

      // Act
      const resultZero = deriveUsoCota(zero);
      const resultAcima = deriveUsoCota(acima);

      // Assert
      expect(
        resultZero.status === 'calculavel' && resultZero.percentualTetoBase,
      ).toBe(0);
      expect(
        resultAcima.status === 'calculavel' && resultAcima.percentualTetoBase,
      ).toBeGreaterThan(100);
    });

    it('usa a UF histórica correspondente a cada mês', () => {
      // Arrange
      const source = input({
        ufs: [
          { dataInicio: '2023-02-01', dataFim: '2023-02-28', siglaUf: 'MG' },
          { dataInicio: '2023-03-01', dataFim: null, siglaUf: 'SP' },
        ],
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result.tetoBaseCents).toBe(TETO_MG_2023 + 4_283_733 * 2);
    });

    it('substitui a categoria SIGEPA quando o ano está completamente reposto', () => {
      // Arrange
      const source = input({
        intervalosExercicio: [{ openedAt: '2025-08-01', closedAt: null }],
        legislaturas: [
          { legislatura: 57, dataInicio: '2025-08-01', dataFim: '2027-01-31' },
        ],
        coberturas: [
          {
            year: 2025,
            coveredThroughMonth: 8,
            sigepaReposto: true,
            sigepaCoveredThroughMonth: 8,
          },
        ],
        gastos: [
          {
            year: 2025,
            gastosJson: { '8': { '998': 100 } },
            gastosSigepaJson: { '8': 250 },
          },
        ],
        ufs: [{ dataInicio: '2025-08-01', dataFim: null, siglaUf: 'MG' }],
        referencia: '2025-08-31',
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toMatchObject({ status: 'calculavel', gastoCents: 250 });
    });

    it('aplica o teto vigente no primeiro dia de cada mês', () => {
      // Arrange
      const source = input({
        intervalosExercicio: [{ openedAt: '2026-02-01', closedAt: null }],
        legislaturas: [
          { legislatura: 57, dataInicio: '2026-02-01', dataFim: '2027-01-31' },
        ],
        coberturas: [
          {
            year: 2026,
            coveredThroughMonth: 3,
            sigepaReposto: true,
            sigepaCoveredThroughMonth: 3,
          },
        ],
        gastos: [],
        ufs: [{ dataInicio: '2026-02-01', dataFim: null, siglaUf: 'MG' }],
        referencia: '2026-03-31',
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result.tetoBaseCents).toBe(4_188_651 + 4_764_591);
    });
  });

  describe('quando faltam sinais necessários', () => {
    it.each([
      ['intervalo-exercicio-ausente', { intervalosExercicio: [] }],
      [
        'intervalo-exercicio-inconsistente',
        {
          intervalosExercicio: [
            { openedAt: '2023-03-01', closedAt: '2023-02-01' },
          ],
        },
      ],
      ['uf-ausente-ou-inconsistente', { ufs: [] }],
      ['fonte-incompleta', { coberturas: [] }],
    ])('retorna %s', (motivo, overrides) => {
      // Arrange
      const source = input(overrides);

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toMatchObject({ status: 'indisponivel', motivo });
    });

    it('não mescla SIGEPA quando o ano não está completamente reposto', () => {
      // Arrange
      const source = input({
        intervalosExercicio: [{ openedAt: '2025-08-01', closedAt: null }],
        legislaturas: [
          { legislatura: 57, dataInicio: '2025-08-01', dataFim: '2027-01-31' },
        ],
        coberturas: [
          {
            year: 2025,
            coveredThroughMonth: 8,
            sigepaReposto: false,
            sigepaCoveredThroughMonth: null,
          },
        ],
        gastos: [],
        ufs: [{ dataInicio: '2025-08-01', dataFim: null, siglaUf: 'MG' }],
        referencia: '2025-08-31',
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toMatchObject({
        status: 'indisponivel',
        motivo: 'sigepa-incompleto',
      });
    });

    it('indisponibiliza a métrica quando não existe teto-base vigente', () => {
      // Arrange
      const source = input({
        intervalosExercicio: [
          { openedAt: '2013-02-01', closedAt: '2013-02-28' },
        ],
        legislaturas: [
          { legislatura: 54, dataInicio: '2013-02-01', dataFim: '2013-02-28' },
        ],
        coberturas: [
          {
            year: 2013,
            coveredThroughMonth: 2,
            sigepaReposto: false,
            sigepaCoveredThroughMonth: null,
          },
        ],
        gastos: [],
        ufs: [{ dataInicio: '2013-02-01', dataFim: null, siglaUf: 'MG' }],
        referencia: '2013-02-28',
      });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toMatchObject({
        status: 'indisponivel',
        motivo: 'teto-base-ausente-ou-zero',
      });
    });
  });

  describe('quando o identificador pertence a um caso anteriormente corrigido', () => {
    it('apura o uso normalmente a partir dos intervalos disponíveis', () => {
      // Arrange
      const source = input({ externalIdDeputado: 204445 });

      // Act
      const result = deriveUsoCota(source);

      // Assert
      expect(result).toMatchObject({
        status: 'calculavel',
        legislatura: 57,
      });
    });
  });
});
