import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { deriveTetoAnualCota, tetoAnualCota } from '../teto-anual-cota';

const anoInteiro = (year: number): readonly IntervaloExercicio[] => [
  { openedAt: `${year}-01-01T00:00:00.000Z`, closedAt: null },
];

describe('teto anual da cota parlamentar', () => {
  describe('quando o deputado exerce o ano civil inteiro', () => {
    it('soma os doze tetos mensais da UF', () => {
      // Arrange
      const intervalos = anoInteiro(2024);

      // Act
      const teto = tetoAnualCota('SP', 2024, intervalos);

      // Assert
      expect(teto).toEqual({ amountCents: 4283733 * 12, monthCount: 12 });
    });

    it('distingue UFs com tetos diferentes no mesmo ano', () => {
      // Arrange
      const intervalos = anoInteiro(2024);

      // Act
      const menor = tetoAnualCota('DF', 2024, intervalos);
      const maior = tetoAnualCota('RR', 2024, intervalos);

      // Assert
      expect(menor?.amountCents).toBe(3658246 * 12);
      expect(maior?.amountCents).toBe(5140633 * 12);
    });
  });

  describe('quando a tabela vira no meio do ano', () => {
    it('aplica a cada mês o teto vigente no seu primeiro dia', () => {
      // Arrange
      const intervalos = anoInteiro(2026);
      const anterior = 4283733;
      const novo = 4872746;

      // Act
      const teto = tetoAnualCota('SP', 2026, intervalos);

      // Assert
      expect(teto).toEqual({
        amountCents: anterior * 2 + novo * 10,
        monthCount: 12,
      });
    });

    it('não antecipa o ato que entra em vigor depois do dia 1º', () => {
      // Arrange
      const intervalos = anoInteiro(2026);

      // Act
      const teto = tetoAnualCota('SP', 2026, intervalos);
      const doZeroSeAntecipasse = 4872746 * 12;

      // Assert
      expect(teto?.amountCents).toBeLessThan(doZeroSeAntecipasse);
    });
  });

  describe('quando o exercício cobre apenas parte do ano', () => {
    it('conta somente os meses tocados pelo exercício', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [
        {
          openedAt: '2024-03-20T00:00:00.000Z',
          closedAt: '2024-07-05T00:00:00.000Z',
        },
      ];

      // Act
      const teto = tetoAnualCota('SP', 2024, intervalos);

      // Assert
      expect(teto).toEqual({ amountCents: 4283733 * 5, monthCount: 5 });
    });

    it('mescla intervalos que voltam ao mesmo mês sem contá-lo duas vezes', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [
        {
          openedAt: '2024-03-01T00:00:00.000Z',
          closedAt: '2024-04-10T00:00:00.000Z',
        },
        {
          openedAt: '2024-04-20T00:00:00.000Z',
          closedAt: '2024-05-15T00:00:00.000Z',
        },
      ];

      // Act
      const teto = tetoAnualCota('SP', 2024, intervalos);

      // Assert
      expect(teto).toEqual({ amountCents: 4283733 * 3, monthCount: 3 });
    });

    it('ignora exercício de outros anos', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [
        {
          openedAt: '2022-02-01T00:00:00.000Z',
          closedAt: '2023-02-01T00:00:00.000Z',
        },
      ];

      // Act
      const teto = tetoAnualCota('SP', 2024, intervalos);

      // Assert
      expect(teto).toBeNull();
    });

    it('conta janeiro do ano de posse para quem já vinha da legislatura anterior', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01T00:00:00.000Z',
          closedAt: null,
        },
      ];
      const reeleito: readonly IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01T00:00:00.000Z',
          closedAt: null,
        },
        {
          openedAt: '2015-02-01T00:00:00.000Z',
          closedAt: '2023-01-31T00:00:00.000Z',
        },
      ];

      // Act
      const estreante = tetoAnualCota('SP', 2023, intervalos);
      const veterano = tetoAnualCota('SP', 2023, reeleito);

      // Assert
      expect(estreante?.monthCount).toBe(12);
      expect(veterano?.monthCount).toBe(12);
    });
  });

  describe('quando não há teto conhecido', () => {
    it('retorna null sem UF de eleição', () => {
      // Arrange
      const intervalos = anoInteiro(2024);

      // Act
      const teto = tetoAnualCota(null, 2024, intervalos);

      // Assert
      expect(teto).toBeNull();
    });

    it('retorna null para UF fora da tabela', () => {
      // Arrange
      const intervalos = anoInteiro(2024);

      // Act
      const teto = tetoAnualCota('XX', 2024, intervalos);

      // Assert
      expect(teto).toBeNull();
    });

    it('retorna null para ano anterior à primeira vigência', () => {
      // Arrange
      const intervalos = anoInteiro(2013);

      // Act
      const teto = tetoAnualCota('SP', 2013, intervalos);

      // Assert
      expect(teto).toBeNull();
    });

    it('cobre o primeiro ano da tabela por inteiro', () => {
      // Arrange
      const intervalos = anoInteiro(2014);

      // Act
      const teto = tetoAnualCota('SP', 2014, intervalos);

      // Assert
      expect(teto).toEqual({ amountCents: 3373095 * 12, monthCount: 12 });
    });

    it('retorna null quando o instante do intervalo é ilegível', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [
        { openedAt: 'sem data', closedAt: null },
      ];

      // Act
      const teto = tetoAnualCota('SP', 2024, intervalos);

      // Assert
      expect(teto).toBeNull();
    });
  });

  describe('quando a apuração distingue os motivos de não haver teto', () => {
    it('apura o teto do ano exercido', () => {
      // Arrange
      const intervalos = anoInteiro(2024);

      // Act
      const apuracao = deriveTetoAnualCota('SP', 2024, intervalos);

      // Assert
      expect(apuracao).toEqual({
        status: 'apurado',
        amountCents: 4283733 * 12,
        monthCount: 12,
      });
    });

    it('separa o ano sem exercício, que não consome direito nenhum', () => {
      // Arrange
      const intervalos: readonly IntervaloExercicio[] = [
        {
          openedAt: '2024-02-01T00:00:00.000Z',
          closedAt: null,
        },
      ];

      // Act
      const apuracao = deriveTetoAnualCota('SP', 2023, intervalos);

      // Assert
      expect(apuracao).toEqual({ status: 'sem-exercicio' });
    });

    it('separa a UF sem tabela publicada, que torna o teto indeterminável', () => {
      // Arrange
      const intervalos = anoInteiro(2024);

      // Act
      const semUf = deriveTetoAnualCota(null, 2024, intervalos);
      const foraDaTabela = deriveTetoAnualCota('XX', 2024, intervalos);
      const anteriorAsVigencias = deriveTetoAnualCota(
        'SP',
        2013,
        anoInteiro(2013),
      );

      // Assert
      expect(semUf).toEqual({ status: 'sem-tabela' });
      expect(foraDaTabela).toEqual({ status: 'sem-tabela' });
      expect(anteriorAsVigencias).toEqual({ status: 'sem-tabela' });
    });
  });
});
