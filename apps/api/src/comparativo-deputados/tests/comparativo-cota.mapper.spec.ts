import { toDeputadoCeapLoadedResponse } from '@/deputados/mappers/deputado-ceap.mapper';
import type { DeputadoCotaJanelaSource } from '@/deputados/types/deputados.types';
import { applyReposicaoSigepa } from '@/shared/cota/reposicao-sigepa';

import { toComparativoCota } from '../mappers/comparativo-cota.mapper';

type AnoSource = DeputadoCotaJanelaSource['anos'][number];

const JANELA_57 = {
  dataInicioJanela: '2023-02-01',
  dataFimJanela: '2027-01-31',
  coberturaAte: '2024-12-31',
};

// Julho está fora da janela da reposição, agosto e setembro dentro; o dump
// publica na janela só os estornos negativos da categoria 998.
const ANO_2025_REPOSTO: Partial<AnoSource> = {
  coveredThroughMonth: 9,
  gastosJson: {
    '7': { '1': 1_000, '998': 40_000 },
    '8': { '1': 2_000, '998': -2_500 },
    '9': { '998': -1_000 },
  },
  sigepaReposto: true,
  sigepaCoveredThroughMonth: 9,
  gastosSigepaJson: { '7': 999_999, '8': 700_000, '9': 120_000 },
};

const GASTO_2025_REPOSTO_CENTS = 1_000 + 40_000 + 2_000 + 700_000 + 120_000;

function anoSource(
  year: number,
  overrides: Partial<AnoSource> = {},
): AnoSource {
  return {
    year,
    coveredThroughMonth: 12,
    gastosJson: { '1': { '1': 100_000 } },
    sigepaReposto: false,
    sigepaCoveredThroughMonth: null,
    gastosSigepaJson: null,
    medianaUf: { amountUsedCents: 200_000, deputadoCount: 53 },
    ...overrides,
  };
}

function cotaSource(
  overrides: Partial<DeputadoCotaJanelaSource> = {},
): DeputadoCotaJanelaSource {
  return {
    siglaUf: 'MG',
    anos: [anoSource(2023), anoSource(2024)],
    intervalosExercicio: [
      { openedAt: '2023-02-01T00:00:00.000Z', closedAt: null },
    ],
    datasInicioLegislatura: ['2023-02-01T00:00:00.000Z'],
    ...overrides,
  };
}

describe('projeção da cota para o comparativo', () => {
  describe('quando a janela tem anos com mediana', () => {
    it('soma os anos e publica a posição frente à mediana da UF', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        status: 'comparavel',
        percentualSobreMedianaUf: 50,
        siglaUf: 'MG',
        anosNaComparacao: 2,
      });
    });

    it('publica o total gasto nos anos comparados', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({ gastoNaComparacaoCents: 200_000 });
    });

    it('detalha cada ano da janela, em ordem, sem o valor gasto do ano', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota.anos.map((ano) => ano.year)).toEqual([2023, 2024]);
      expect(cota.anos[0]).toMatchObject({
        naComparacao: true,
        percentualSobreMedianaUf: 50,
        medianaUfDeputadoCount: 53,
        dadoIncompleto: false,
      });
      expect(JSON.stringify(cota.anos)).not.toContain('100000');
    });

    it('declara a exposição em dias dos anos comparados', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        status: 'comparavel',
        diasEmExercicio: 699,
        diasNaComparacao: 699,
      });
    });
  });

  describe('quando as réguas da comparação são publicadas', () => {
    const TETO_MENSAL_MG_2023 = 4_188_651;
    const TETO_MENSAL_MG_2026 = 4_764_591;

    it('publica a soma das medianas usada como denominador', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({ medianaNaComparacaoCents: 400_000 });
    });

    it('soma o teto dos meses com direito à cota nos anos comparados', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        tetoNaComparacaoCents: TETO_MENSAL_MG_2023 * (11 + 12),
      });
    });

    it('corta o teto na cobertura, a mesma régua do gasto', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2026, { coveredThroughMonth: 6 })],
      });

      // Act
      const cota = toComparativoCota({
        dataInicioJanela: '2023-02-01',
        dataFimJanela: '2027-01-31',
        coberturaAte: '2026-06-30',
        source,
      });

      // Assert
      expect(cota).toMatchObject({
        tetoNaComparacaoCents:
          TETO_MENSAL_MG_2023 * 2 + TETO_MENSAL_MG_2026 * 4,
      });
    });

    it('não deixa o ano sem exercício zerar o teto da janela inteira', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2023, { gastosJson: null }), anoSource(2024)],
        intervalosExercicio: [
          { openedAt: '2024-01-01T00:00:00.000Z', closedAt: null },
        ],
      });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        tetoNaComparacaoCents: TETO_MENSAL_MG_2023 * 12,
      });
    });

    it('deixa o teto indeterminável quando a UF não tem tabela publicada', () => {
      // Arrange
      const source = cotaSource({ siglaUf: 'XX' });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        status: 'comparavel',
        tetoNaComparacaoCents: null,
      });
    });
  });

  describe('quando o deputado não esteve na Câmara em um dos anos', () => {
    it('mantém o ano na comparação com numerador zero e sem dias', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2023, { gastosJson: null }), anoSource(2024)],
        intervalosExercicio: [
          { openedAt: '2024-01-01T00:00:00.000Z', closedAt: null },
        ],
      });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota.anos[0]).toMatchObject({
        year: 2023,
        naComparacao: true,
        percentualSobreMedianaUf: 0,
        diasEmExercicio: 0,
      });
      expect(cota).toMatchObject({
        status: 'comparavel',
        percentualSobreMedianaUf: 25,
        anosNaComparacao: 2,
      });
    });
  });

  describe('quando o deputado ficou de licença parte de todos os anos', () => {
    it('continua comparável e divulga os dias em exercício', () => {
      // Arrange
      const source = cotaSource({
        intervalosExercicio: [
          {
            openedAt: '2023-04-01T00:00:00.000Z',
            closedAt: '2023-11-01T00:00:00.000Z',
          },
          {
            openedAt: '2024-04-01T00:00:00.000Z',
            closedAt: '2024-11-01T00:00:00.000Z',
          },
        ],
      });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        status: 'comparavel',
        anosNaComparacao: 2,
        diasEmExercicio: 214 + 214,
      });
    });
  });

  describe('quando um ano da janela não tem mediana da UF', () => {
    it('deixa o ano fora das somas sem perder a linha', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2023, { medianaUf: null }), anoSource(2024)],
      });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota.anos[0]).toMatchObject({
        year: 2023,
        naComparacao: false,
        percentualSobreMedianaUf: null,
        medianaUfDeputadoCount: null,
      });
      expect(cota).toMatchObject({
        status: 'comparavel',
        anosNaComparacao: 1,
        percentualSobreMedianaUf: 50,
      });
    });
  });

  describe('quando nenhum ano da janela tem mediana da UF', () => {
    it('não compara e declara a ausência de mediana na janela', () => {
      // Arrange
      const source = cotaSource({
        anos: [
          anoSource(2023, { medianaUf: null }),
          anoSource(2024, { medianaUf: null }),
        ],
      });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        status: 'sem-comparacao',
        motivo: 'sem-mediana-na-janela',
      });
      expect(cota.anos).toHaveLength(2);
    });
  });

  describe('quando o deputado não tem gasto em nenhum ano da janela', () => {
    it('não compara e declara a ausência de gastos', () => {
      // Arrange
      const source = cotaSource({
        siglaUf: null,
        anos: [
          anoSource(2023, { gastosJson: null, medianaUf: null }),
          anoSource(2024, { gastosJson: null, medianaUf: null }),
        ],
      });

      // Act
      const cota = toComparativoCota({ ...JANELA_57, source });

      // Assert
      expect(cota).toMatchObject({
        status: 'sem-comparacao',
        motivo: 'sem-gastos',
      });
    });
  });

  describe('quando a fonte da cota trunca no meio do ano', () => {
    it('mantém o ano na comparação e o marca como incompleto', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2026, { coveredThroughMonth: 6 })],
      });

      // Act
      const cota = toComparativoCota({
        dataInicioJanela: '2023-02-01',
        dataFimJanela: '2027-01-31',
        coberturaAte: '2026-06-30',
        source,
      });

      // Assert
      expect(cota.anos[0]).toMatchObject({
        year: 2026,
        naComparacao: true,
        dadoIncompleto: true,
      });
      expect(cota.status).toBe('comparavel');
    });
  });

  describe('quando a cobertura não alcança um ano da janela', () => {
    it('não publica o ano descoberto', () => {
      // Arrange
      const source = cotaSource();

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2023-12-31',
        source,
      });

      // Assert
      expect(cota.anos.map((ano) => ano.year)).toEqual([2023]);
    });
  });

  describe('quando a janela atravessa um ano reposto', () => {
    it('soma o valor reposto no lugar da categoria 998 do dump', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2024), anoSource(2025, { ...ANO_2025_REPOSTO })],
      });

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2025-09-30',
        source,
      });

      // Assert
      expect(cota).toMatchObject({
        status: 'comparavel',
        gastoNaComparacaoCents: 100_000 + GASTO_2025_REPOSTO_CENTS,
      });
    });

    it('mantém fora da janela o mês que o dump ainda publica', () => {
      // Arrange
      const source = cotaSource({
        anos: [
          anoSource(2025, {
            ...ANO_2025_REPOSTO,
            gastosJson: { '7': { '998': 40_000 } },
            gastosSigepaJson: { '7': 999_999 },
          }),
        ],
      });

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2025-09-30',
        source,
      });

      // Assert
      expect(cota).toMatchObject({ gastoNaComparacaoCents: 40_000 });
    });

    it('declara o ano reposto como dado completo', () => {
      // Arrange
      const source = cotaSource({
        anos: [anoSource(2025, { ...ANO_2025_REPOSTO })],
      });

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2025-09-30',
        source,
      });

      // Assert
      expect(cota.anos[0]).toMatchObject({
        year: 2025,
        dadoIncompleto: false,
      });
    });
  });

  describe('quando a janela atravessa um ano da janela ainda não reposto', () => {
    it('soma o dump puro, com os estornos negativos que ele publica', () => {
      // Arrange
      const source = cotaSource({
        anos: [
          anoSource(2025, {
            ...ANO_2025_REPOSTO,
            sigepaReposto: false,
            sigepaCoveredThroughMonth: null,
          }),
        ],
      });

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2025-09-30',
        source,
      });

      // Assert
      expect(cota).toMatchObject({
        gastoNaComparacaoCents: 1_000 + 40_000 + 2_000 - 2_500 - 1_000,
      });
      expect(cota.anos[0]).toMatchObject({ dadoIncompleto: true });
    });

    it('soma o dump puro quando a cobertura do dump passa da reposição', () => {
      // Arrange
      const source = cotaSource({
        anos: [
          anoSource(2025, { ...ANO_2025_REPOSTO, coveredThroughMonth: 10 }),
        ],
      });

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2025-10-31',
        source,
      });

      // Assert
      expect(cota).toMatchObject({
        gastoNaComparacaoCents: 1_000 + 40_000 + 2_000 - 2_500 - 1_000,
      });
      expect(cota.anos[0]).toMatchObject({ dadoIncompleto: true });
    });
  });

  describe('quando o mesmo ano reposto é lido pelo perfil e pelo comparativo', () => {
    it('publica o mesmo total nos dois lugares', () => {
      // Arrange
      const ano = anoSource(2025, { ...ANO_2025_REPOSTO });
      const source = cotaSource({ anos: [ano] });

      // Act
      const cota = toComparativoCota({
        ...JANELA_57,
        coberturaAte: '2025-09-30',
        source,
      });
      const perfil = toDeputadoCeapLoadedResponse({
        year: ano.year,
        availableYears: [ano.year],
        status: 'ok',
        coveredThroughMonth: ano.coveredThroughMonth ?? 0,
        anoReposto: true,
        gastosJson:
          applyReposicaoSigepa({
            year: ano.year,
            anoReposto: true,
            gastosJson: ano.gastosJson,
            gastosSigepaJson: ano.gastosSigepaJson,
          }) ?? {},
        source: {
          coberturas: [],
          gasto: null,
          gastosSigepaJson: ano.gastosSigepaJson,
          categorias: [
            { externalNumSubCota: 1, description: 'Combustíveis' },
            { externalNumSubCota: 998, description: 'PASSAGEM AÉREA - SIGEPA' },
          ],
          medianaUf: null,
          intervalosExercicio: source.intervalosExercicio,
          datasInicioLegislatura: source.datasInicioLegislatura,
        },
      });

      // Assert
      expect(
        cota.status === 'comparavel' ? cota.gastoNaComparacaoCents : null,
      ).toBe(perfil.totalAmountUsedCents);
    });
  });
});
