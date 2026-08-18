import { deriveJanelaComparativo } from '../rules/janela-comparativo';

const LEGISLATURA_55 = {
  legislatura: 55,
  dataInicio: '2015-02-01',
  dataFim: '2019-01-31',
};
const LEGISLATURA_56 = {
  legislatura: 56,
  dataInicio: '2019-02-01',
  dataFim: '2023-01-31',
};
const LEGISLATURA_57 = {
  legislatura: 57,
  dataInicio: '2023-02-01',
  dataFim: '2027-01-31',
};
const LEGISLATURA_54 = {
  legislatura: 54,
  dataInicio: '2011-02-01',
  dataFim: '2015-01-31',
};
const LEGISLATURA_51 = {
  legislatura: 51,
  dataInicio: '1999-02-01',
  dataFim: '2003-01-31',
};

const LEGISLATURAS = [
  LEGISLATURA_51,
  LEGISLATURA_54,
  LEGISLATURA_55,
  LEGISLATURA_56,
  LEGISLATURA_57,
];

const REFERENCIA = '2026-08-14T12:00:00Z';

describe('janela do comparativo por legislatura', () => {
  describe('deputado em atividade na legislatura corrente', () => {
    it('usa a legislatura corrente com fim nominal e dias em exercício desde a posse', () => {
      // Arrange
      const input = {
        intervalosExercicio: [
          { openedAt: '2023-02-01T12:00:01Z', closedAt: null },
        ],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 57, periodo: LEGISLATURA_57 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toMatchObject({
        status: 'disponivel',
        legislatura: 57,
        dataInicio: LEGISLATURA_57.dataInicio,
        dataFim: LEGISLATURA_57.dataFim,
        encerrada: false,
        diasEmExercicioDisponivel: true,
      });
      expect(
        janela.status === 'disponivel' ? janela.diasEmExercicio : null,
      ).toEqual(expect.any(Number));
    });
  });

  describe('deputado que saiu no meio da legislatura corrente', () => {
    it('trunca a janela no último dia de exercício, sem recuar para a legislatura anterior', () => {
      // Arrange
      const input = {
        intervalosExercicio: [
          {
            openedAt: '2023-02-01T12:00:01Z',
            closedAt: '2025-04-10T00:00:00Z',
          },
        ],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 57, periodo: LEGISLATURA_57 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toMatchObject({
        status: 'disponivel',
        legislatura: 57,
        dataInicio: LEGISLATURA_57.dataInicio,
        dataFim: '2025-04-10T00:00:00.000Z',
        encerrada: true,
      });
    });
  });

  describe('deputado cuja última atividade foi em legislatura anterior', () => {
    it('usa a legislatura em que o último intervalo se encerrou, não a legislatura corrente', () => {
      // Arrange
      const input = {
        intervalosExercicio: [
          {
            openedAt: '2019-02-01T12:00:01Z',
            closedAt: '2022-06-15T00:00:00Z',
          },
        ],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 56, periodo: LEGISLATURA_56 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toMatchObject({
        status: 'disponivel',
        legislatura: 56,
        dataInicio: LEGISLATURA_56.dataInicio,
        dataFim: '2022-06-15T00:00:00.000Z',
        encerrada: true,
      });
    });
  });

  describe('deputado abaixo do piso da 55ª legislatura', () => {
    it('recusa com motivo e devolve a última legislatura em atividade', () => {
      // Arrange
      const input = {
        intervalosExercicio: [
          {
            openedAt: '2011-02-01T12:00:01Z',
            closedAt: '2014-06-15T00:00:00Z',
          },
        ],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 54, periodo: LEGISLATURA_54 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toEqual({
        status: 'indisponivel',
        motivo: 'legislatura-anterior-a-cobertura',
        ultimaLegislatura: 54,
      });
    });
  });

  describe('ausência de intervalos utilizáveis', () => {
    it('cai para o período da legislatura final registrada, com dias em exercício indisponíveis', () => {
      // Arrange
      const input = {
        intervalosExercicio: [],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 57, periodo: LEGISLATURA_57 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toEqual({
        status: 'disponivel',
        legislatura: 57,
        dataInicio: LEGISLATURA_57.dataInicio,
        dataFim: LEGISLATURA_57.dataFim,
        encerrada: false,
        diasEmExercicioDisponivel: false,
        diasEmExercicio: null,
      });
    });

    it('recusa pelo piso quando a legislatura final registrada é anterior à 55ª', () => {
      // Arrange
      const input = {
        intervalosExercicio: [],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 51, periodo: LEGISLATURA_51 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toEqual({
        status: 'indisponivel',
        motivo: 'legislatura-anterior-a-cobertura',
        ultimaLegislatura: 51,
      });
    });

    it('devolve motivo sem-legislatura-registrada quando não há período algum', () => {
      // Arrange
      const input = {
        intervalosExercicio: [],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: null, periodo: null },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toEqual({
        status: 'indisponivel',
        motivo: 'sem-legislatura-registrada',
        ultimaLegislatura: null,
      });
    });
  });

  describe('múltiplos intervalos descontínuos dentro da mesma legislatura', () => {
    it('soma apenas os dias efetivamente cobertos pelos intervalos', () => {
      // Arrange
      const input = {
        intervalosExercicio: [
          {
            openedAt: '2023-02-01T00:00:00Z',
            closedAt: '2023-03-01T00:00:00Z',
          },
          {
            openedAt: '2023-06-01T00:00:00Z',
            closedAt: '2023-07-01T00:00:00Z',
          },
        ],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 57, periodo: LEGISLATURA_57 },
        referencia: REFERENCIA,
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toMatchObject({
        status: 'disponivel',
        diasEmExercicioDisponivel: true,
        diasEmExercicio: 28 + 30,
      });
    });
  });

  describe('intervalo aberto sem fechamento', () => {
    it('usa a referência como âncora e conta os dias até a referência', () => {
      // Arrange
      const input = {
        intervalosExercicio: [
          { openedAt: '2023-02-01T00:00:00Z', closedAt: null },
        ],
        legislaturas: LEGISLATURAS,
        legislaturaFinal: { legislatura: 57, periodo: LEGISLATURA_57 },
        referencia: '2023-02-11T00:00:00Z',
      };

      // Act
      const janela = deriveJanelaComparativo(input);

      // Assert
      expect(janela).toMatchObject({
        status: 'disponivel',
        legislatura: 57,
        encerrada: false,
        diasEmExercicioDisponivel: true,
        diasEmExercicio: 10,
      });
    });
  });
});
