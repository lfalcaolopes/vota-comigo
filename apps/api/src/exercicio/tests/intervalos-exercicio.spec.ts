import {
  deriveIntervalosExercicio,
  getPartidoVigente,
  isEmExercicio,
} from '../rules/intervalos-exercicio';
import type { EventoExercicio } from '../types/exercicio.types';

function evento(overrides: Partial<EventoExercicio> = {}): EventoExercicio {
  return {
    dataHora: '2023-02-01T12:00:00Z',
    situacao: 'Exercício',
    descricaoStatus: 'Entrada - Posse de Eleito Titular',
    partido: null,
    ...overrides,
  };
}

describe('deriveIntervalosExercicio', () => {
  describe('when the deputy took office and later left', () => {
    it('derives one closed interval bounded by the entry and exit', () => {
      // Arrange
      const posse = evento({
        dataHora: '2019-02-01T12:00:00Z',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
      });
      const saida = evento({
        dataHora: '2023-01-31T23:59:00Z',
        situacao: 'Fim de Mandato',
        descricaoStatus: 'Saída - Término da Legislatura',
      });

      // Act
      const intervalos = deriveIntervalosExercicio([posse, saida]);

      // Assert
      expect(intervalos).toEqual([
        { openedAt: '2019-02-01T12:00:00Z', closedAt: '2023-01-31T23:59:00Z' },
      ]);
    });
  });

  describe('when the deputy is still in office', () => {
    it('derives an open-ended interval with closedAt null', () => {
      // Arrange
      const posse = evento({ dataHora: '2023-02-01T12:00:00Z' });

      // Act
      const intervalos = deriveIntervalosExercicio([posse]);

      // Assert
      expect(intervalos).toEqual([
        { openedAt: '2023-02-01T12:00:00Z', closedAt: null },
      ]);
    });
  });
});

describe('isEmExercicio', () => {
  describe('when the deputy took office before the vote', () => {
    it('treats Entrada - Posse de Eleito Titular as opening an interval', () => {
      // Arrange
      const posse = evento({
        dataHora: '2023-02-01T12:00:00Z',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
      });

      // Act
      const emExercicio = isEmExercicio([posse], '2023-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the term ends with Saída - Término da Legislatura', () => {
    it('closes the interval after the exit timestamp', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01T12:00:00Z' });
      const saida = evento({
        dataHora: '2023-01-31T23:59:00Z',
        situacao: 'Fim de Mandato',
        descricaoStatus:
          'Saída - Fim de Exercício de Suplente - Término da Legislatura',
      });

      // Act
      const durante = isEmExercicio([posse, saida], '2021-06-01T12:00:00Z');
      const depois = isEmExercicio([posse, saida], '2023-06-01T12:00:00Z');

      // Assert
      expect(durante).toBe(true);
      expect(depois).toBe(false);
    });
  });

  describe('when a suplente reassumes the seat', () => {
    it('treats Entrada - Reassunção as opening an interval', () => {
      // Arrange
      const reassuncao = evento({
        dataHora: '2021-05-10T10:00:00Z',
        situacao: 'Exercício',
        descricaoStatus: 'Entrada - Reassunção',
      });

      // Act
      const emExercicio = isEmExercicio([reassuncao], '2021-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the only record is the legacy first-posse marker', () => {
    it('opens an interval from Primeira posse na legislatura (dados legados)', () => {
      // Arrange
      const legado = evento({
        dataHora: '2019-02-01T00:00:00Z',
        situacao: 'Exercício',
        descricaoStatus: 'Primeira posse na legislatura (dados legados)',
      });

      // Act
      const emExercicio = isEmExercicio([legado], '2019-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the legacy end-of-legislature marker carries situacao Exercício', () => {
    it('still closes the interval', () => {
      // Arrange
      const posse = evento({ dataHora: '2015-02-01T12:00:00Z' });
      const legado = evento({
        dataHora: '2019-01-31T00:00:00Z',
        situacao: 'Exercício',
        descricaoStatus:
          'Situação e condição ao fim da legislatura (dados legados)',
      });

      // Act
      const emExercicio = isEmExercicio(
        [posse, legado],
        '2020-06-01T12:00:00Z',
      );

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when a Licença is registered', () => {
    it('closes the interval until a next entry', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01T12:00:00Z' });
      const licenca = evento({
        dataHora: '2020-08-01T12:00:00Z',
        situacao: 'Licença',
        descricaoStatus: 'Licença para tratar de interesses particulares',
      });
      const eventos = [posse, licenca];

      // Act
      const durante = isEmExercicio(eventos, '2020-09-01T12:00:00Z');

      // Assert
      expect(durante).toBe(false);
    });
  });

  describe('when a Suplência is registered', () => {
    it('closes the interval of the suplente until a next entry', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01T12:00:00Z' });
      const suplencia = evento({
        dataHora: '2020-08-01T12:00:00Z',
        situacao: 'Suplência',
        descricaoStatus: 'Retorno à suplência',
      });

      // Act
      const durante = isEmExercicio([posse, suplencia], '2020-09-01T12:00:00Z');

      // Assert
      expect(durante).toBe(false);
    });
  });

  describe('when a Vacância is registered', () => {
    it('closes the interval by death, resignation or mandate loss', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01T12:00:00Z' });
      const vacancia = evento({
        dataHora: '2021-04-13T21:10:00Z',
        situacao: 'Vacância',
        descricaoStatus: 'Saída - Afastamento definitivo - Falecimento',
      });

      // Act
      const antes = isEmExercicio([posse, vacancia], '2021-03-11T12:00:00Z');
      const depois = isEmExercicio([posse, vacancia], '2021-05-13T12:00:00Z');

      // Assert
      expect(antes).toBe(true);
      expect(depois).toBe(false);
    });
  });

  describe('when the initial snapshot has situacao null', () => {
    it('does not open an interval by itself', () => {
      // Arrange
      const snapshot = evento({
        dataHora: '2019-02-01T00:00:00Z',
        situacao: null,
        descricaoStatus: 'Snapshot inicial de legislatura',
      });

      // Act
      const emExercicio = isEmExercicio([snapshot], '2019-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when a Convocação happens without posse or reassunção', () => {
    it('does not open an interval by itself', () => {
      // Arrange
      const convocacao = evento({
        dataHora: '2021-03-01T12:00:00Z',
        situacao: 'Convocado',
        descricaoStatus: 'Convocação de suplente',
      });

      // Act
      const emExercicio = isEmExercicio([convocacao], '2021-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when situacao Convocado comes with descricaoStatus Entrada - Reassunção', () => {
    it('opens an interval', () => {
      // Arrange
      const convocado = evento({
        dataHora: '2021-03-01T12:00:00Z',
        situacao: 'Convocado',
        descricaoStatus: 'Entrada - Reassunção',
      });

      // Act
      const emExercicio = isEmExercicio([convocado], '2021-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when an entry and an administrative event share the same data_hora', () => {
    it('lets the effective transition prevail over the administrative event', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01T12:00:00Z' });
      const saida = evento({
        dataHora: '2021-04-13T21:10:00Z',
        situacao: 'Vacância',
        descricaoStatus: 'Saída - Afastamento definitivo - Falecimento',
      });
      const alteracaoMesmoInstante = evento({
        dataHora: '2021-04-13T21:10:00Z',
        situacao: 'Exercício',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_C',
      });

      // Act
      const emExercicio = isEmExercicio(
        [posse, alteracaoMesmoInstante, saida],
        '2021-05-01T12:00:00Z',
      );

      // Assert
      expect(emExercicio).toBe(false);
    });
  });
});

describe('getPartidoVigente', () => {
  describe('when a party change happens during a Licença', () => {
    it('keeps the leave closed but updates the party in effect', () => {
      // Arrange
      const posse = evento({
        dataHora: '2019-02-01T12:00:00Z',
        partido: 'PARTIDO_A',
      });
      const licenca = evento({
        dataHora: '2020-08-01T12:00:00Z',
        situacao: 'Licença',
        descricaoStatus: 'Licença para tratar de interesses particulares',
        partido: 'PARTIDO_A',
      });
      const alteracao = evento({
        dataHora: '2020-09-15T09:00:00Z',
        situacao: 'Licença',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_B',
      });
      const eventos = [posse, licenca, alteracao];

      // Act
      const emExercicio = isEmExercicio(eventos, '2020-10-01T12:00:00Z');
      const partido = getPartidoVigente(eventos, '2020-10-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(false);
      expect(partido).toBe('PARTIDO_B');
    });
  });

  describe('when a party change happens while the deputy is in office', () => {
    it('keeps the interval open and updates the party in effect', () => {
      // Arrange
      const posse = evento({
        dataHora: '2023-02-01T12:00:00Z',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
        partido: 'PARTIDO_A',
      });
      const alteracao = evento({
        dataHora: '2024-03-10T09:00:00Z',
        situacao: 'Exercício',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_B',
      });
      const eventos = [posse, alteracao];

      // Act
      const emExercicio = isEmExercicio(eventos, '2024-06-01T12:00:00Z');
      const partido = getPartidoVigente(eventos, '2024-06-01T12:00:00Z');

      // Assert
      expect(emExercicio).toBe(true);
      expect(partido).toBe('PARTIDO_B');
    });
  });
});
