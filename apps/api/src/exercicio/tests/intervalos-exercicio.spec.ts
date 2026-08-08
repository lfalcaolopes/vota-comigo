import { toEpochMillis } from '../rules/instante';
import {
  deriveIntervalosExercicio,
  getPartidoVigente,
  isEmAtividadeFromIntervalos,
  isEmExercicio,
  isEmExercicioFromIntervalos,
} from '../rules/intervalos-exercicio';
import type {
  EventoExercicio,
  IntervaloExercicio,
} from '../types/exercicio.types';

// deputado_historico.data_hora é timestamptz: o driver entrega separador em
// espaço e offset de dois dígitos, não ISO-8601.
function evento(overrides: Partial<EventoExercicio> = {}): EventoExercicio {
  return {
    dataHora: '2023-02-01 12:00:00+00',
    situacao: 'Exercício',
    descricaoStatus: 'Entrada - Posse de Eleito Titular',
    partido: null,
    ...overrides,
  };
}

function instante(valor: string): number {
  const epoch = toEpochMillis(valor);
  if (epoch === null) {
    throw new Error(`instante invalido no teste: ${valor}`);
  }
  return epoch;
}

describe('deriveIntervalosExercicio', () => {
  describe('when the deputy took office and later left', () => {
    it('derives one closed interval bounded by the entry and exit', () => {
      // Arrange
      const posse = evento({
        dataHora: '2019-02-01 12:00:00+00',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
      });
      const saida = evento({
        dataHora: '2023-01-31 23:59:00+00',
        situacao: 'Fim de Mandato',
        descricaoStatus: 'Saída - Término da Legislatura',
      });

      // Act
      const intervalos = deriveIntervalosExercicio([posse, saida]);

      // Assert
      expect(intervalos).toEqual([
        {
          openedAt: '2019-02-01 12:00:00+00',
          closedAt: '2023-01-31 23:59:00+00',
        },
      ]);
    });
  });

  describe('when the deputy is still in office', () => {
    it('derives an open-ended interval with closedAt null', () => {
      // Arrange
      const posse = evento({ dataHora: '2023-02-01 12:00:00+00' });

      // Act
      const intervalos = deriveIntervalosExercicio([posse]);

      // Assert
      expect(intervalos).toEqual([
        { openedAt: '2023-02-01 12:00:00+00', closedAt: null },
      ]);
    });
  });

  describe('when the events arrive in offsets that differ from wall-clock order', () => {
    it('orders them by the underlying instant, not by the raw string', () => {
      // Arrange - 09:00-03 é 12:00Z, ou seja posterior ao evento das 10:00Z
      const posse = evento({ dataHora: '2019-02-01 10:00:00+00' });
      const saida = evento({
        dataHora: '2019-02-01 09:00:00-03',
        situacao: 'Fim de Mandato',
        descricaoStatus: 'Saída - Término da Legislatura',
      });

      // Act
      const intervalos = deriveIntervalosExercicio([saida, posse]);

      // Assert
      expect(intervalos).toEqual([
        {
          openedAt: '2019-02-01 10:00:00+00',
          closedAt: '2019-02-01 09:00:00-03',
        },
      ]);
    });
  });

  describe('when an event carries an unparseable data_hora', () => {
    it('drops it instead of ordering it by string', () => {
      // Arrange
      const posse = evento({ dataHora: '2023-02-01 12:00:00+00' });
      const corrompido = evento({
        dataHora: 'sem data',
        situacao: 'Fim de Mandato',
        descricaoStatus: 'Saída - Término da Legislatura',
      });

      // Act
      const intervalos = deriveIntervalosExercicio([posse, corrompido]);

      // Assert
      expect(intervalos).toEqual([
        { openedAt: '2023-02-01 12:00:00+00', closedAt: null },
      ]);
    });
  });
});

describe('isEmExercicio', () => {
  describe('when the deputy took office before the vote', () => {
    it('treats Entrada - Posse de Eleito Titular as opening an interval', () => {
      // Arrange
      const posse = evento({
        dataHora: '2023-02-01 12:00:00+00',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
      });

      // Act
      const emExercicio = isEmExercicio([posse], '2023-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the term ends with Saída - Término da Legislatura', () => {
    it('closes the interval after the exit timestamp', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01 12:00:00+00' });
      const saida = evento({
        dataHora: '2023-01-31 23:59:00+00',
        situacao: 'Fim de Mandato',
        descricaoStatus:
          'Saída - Fim de Exercício de Suplente - Término da Legislatura',
      });

      // Act
      const durante = isEmExercicio([posse, saida], '2021-06-01 12:00:00+00');
      const depois = isEmExercicio([posse, saida], '2023-06-01 12:00:00+00');

      // Assert
      expect(durante).toBe(true);
      expect(depois).toBe(false);
    });
  });

  describe('when a suplente reassumes the seat', () => {
    it('treats Entrada - Reassunção as opening an interval', () => {
      // Arrange
      const reassuncao = evento({
        dataHora: '2021-05-10 10:00:00+00',
        situacao: 'Exercício',
        descricaoStatus: 'Entrada - Reassunção',
      });

      // Act
      const emExercicio = isEmExercicio([reassuncao], '2021-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the only record is the legacy first-posse marker', () => {
    it('opens an interval from Primeira posse na legislatura (dados legados)', () => {
      // Arrange
      const legado = evento({
        dataHora: '2019-02-01 00:00:00+00',
        situacao: 'Exercício',
        descricaoStatus: 'Primeira posse na legislatura (dados legados)',
      });

      // Act
      const emExercicio = isEmExercicio([legado], '2019-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the legacy end-of-legislature marker carries situacao Exercício', () => {
    it('still closes the interval', () => {
      // Arrange
      const posse = evento({ dataHora: '2015-02-01 12:00:00+00' });
      const legado = evento({
        dataHora: '2019-01-31 00:00:00+00',
        situacao: 'Exercício',
        descricaoStatus:
          'Situação e condição ao fim da legislatura (dados legados)',
      });

      // Act
      const emExercicio = isEmExercicio(
        [posse, legado],
        '2020-06-01 12:00:00+00',
      );

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when a Licença is registered', () => {
    it('closes the interval until a next entry', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01 12:00:00+00' });
      const licenca = evento({
        dataHora: '2020-08-01 12:00:00+00',
        situacao: 'Licença',
        descricaoStatus: 'Licença para tratar de interesses particulares',
      });
      const eventos = [posse, licenca];

      // Act
      const durante = isEmExercicio(eventos, '2020-09-01 12:00:00+00');

      // Assert
      expect(durante).toBe(false);
    });
  });

  describe('when a Suplência is registered', () => {
    it('closes the interval of the suplente until a next entry', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01 12:00:00+00' });
      const suplencia = evento({
        dataHora: '2020-08-01 12:00:00+00',
        situacao: 'Suplência',
        descricaoStatus: 'Retorno à suplência',
      });

      // Act
      const durante = isEmExercicio(
        [posse, suplencia],
        '2020-09-01 12:00:00+00',
      );

      // Assert
      expect(durante).toBe(false);
    });
  });

  describe('when a Vacância is registered', () => {
    it('closes the interval by death, resignation or mandate loss', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01 12:00:00+00' });
      const vacancia = evento({
        dataHora: '2021-04-13 21:10:00+00',
        situacao: 'Vacância',
        descricaoStatus: 'Saída - Afastamento definitivo - Falecimento',
      });

      // Act
      const antes = isEmExercicio([posse, vacancia], '2021-03-11 12:00:00+00');
      const depois = isEmExercicio([posse, vacancia], '2021-05-13 12:00:00+00');

      // Assert
      expect(antes).toBe(true);
      expect(depois).toBe(false);
    });
  });

  describe('when the initial snapshot has situacao null', () => {
    it('does not open an interval by itself', () => {
      // Arrange
      const snapshot = evento({
        dataHora: '2019-02-01 00:00:00+00',
        situacao: null,
        descricaoStatus: 'Snapshot inicial de legislatura',
      });

      // Act
      const emExercicio = isEmExercicio([snapshot], '2019-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when a Convocação happens without posse or reassunção', () => {
    it('does not open an interval by itself', () => {
      // Arrange
      const convocacao = evento({
        dataHora: '2021-03-01 12:00:00+00',
        situacao: 'Convocado',
        descricaoStatus: 'Convocação de suplente',
      });

      // Act
      const emExercicio = isEmExercicio([convocacao], '2021-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when situacao Convocado comes with descricaoStatus Entrada - Reassunção', () => {
    it('opens an interval', () => {
      // Arrange
      const convocado = evento({
        dataHora: '2021-03-01 12:00:00+00',
        situacao: 'Convocado',
        descricaoStatus: 'Entrada - Reassunção',
      });

      // Act
      const emExercicio = isEmExercicio([convocado], '2021-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when an entry and an administrative event share the same data_hora', () => {
    it('lets the effective transition prevail over the administrative event', () => {
      // Arrange
      const posse = evento({ dataHora: '2019-02-01 12:00:00+00' });
      const saida = evento({
        dataHora: '2021-04-13 21:10:00+00',
        situacao: 'Vacância',
        descricaoStatus: 'Saída - Afastamento definitivo - Falecimento',
      });
      const alteracaoMesmoInstante = evento({
        dataHora: '2021-04-13 21:10:00+00',
        situacao: 'Exercício',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_C',
      });

      // Act
      const emExercicio = isEmExercicio(
        [posse, alteracaoMesmoInstante, saida],
        '2021-05-01 12:00:00+00',
      );

      // Assert
      expect(emExercicio).toBe(false);
    });
  });

  describe('when the instant is not a parseable date', () => {
    it('returns false instead of comparing garbage', () => {
      // Arrange
      const posse = evento({ dataHora: '2023-02-01 12:00:00+00' });

      // Act
      const emExercicio = isEmExercicio([posse], 'sem data');

      // Assert
      expect(emExercicio).toBe(false);
    });
  });
});

describe('isEmExercicioFromIntervalos', () => {
  describe('when the instant falls inside an open-ended interval', () => {
    it('returns true', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [
        { openedAt: '2023-02-01 12:00:00+00', closedAt: null },
      ];

      // Act
      const emExercicio = isEmExercicioFromIntervalos(
        intervalos,
        instante('2023-06-01 12:00:00+00'),
      );

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when the instant falls after a closed interval', () => {
    it('returns false', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01 12:00:00+00',
          closedAt: '2023-01-31 23:59:00+00',
        },
      ];

      // Act
      const durante = isEmExercicioFromIntervalos(
        intervalos,
        instante('2021-06-01 12:00:00+00'),
      );
      const depois = isEmExercicioFromIntervalos(
        intervalos,
        instante('2023-06-01 12:00:00+00'),
      );

      // Assert
      expect(durante).toBe(true);
      expect(depois).toBe(false);
    });
  });

  describe('when the instant sits exactly on a boundary', () => {
    it('includes the opening instant and excludes the closing one', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01 12:00:00+00',
          closedAt: '2023-01-31 23:59:00+00',
        },
      ];

      // Act
      const naAbertura = isEmExercicioFromIntervalos(
        intervalos,
        instante('2019-02-01 12:00:00+00'),
      );
      const noFechamento = isEmExercicioFromIntervalos(
        intervalos,
        instante('2023-01-31 23:59:00+00'),
      );

      // Assert
      expect(naAbertura).toBe(true);
      expect(noFechamento).toBe(false);
    });
  });

  describe('when the interval bounds and the instant use different offsets', () => {
    it('compares the underlying instants', () => {
      // Arrange - 09:00-03 é 12:00Z, dentro do intervalo
      const intervalos: IntervaloExercicio[] = [
        {
          openedAt: '2023-06-01 11:00:00+00',
          closedAt: '2023-06-01 13:00:00+00',
        },
      ];

      // Act
      const emExercicio = isEmExercicioFromIntervalos(
        intervalos,
        instante('2023-06-01 09:00:00-03'),
      );

      // Assert
      expect(emExercicio).toBe(true);
    });
  });

  describe('when an interval carries an unparseable bound', () => {
    it('does not treat it as a match', () => {
      // Arrange
      const aberturaInvalida: IntervaloExercicio[] = [
        { openedAt: 'sem data', closedAt: null },
      ];
      const fechamentoInvalido: IntervaloExercicio[] = [
        { openedAt: '2019-02-01 12:00:00+00', closedAt: 'sem data' },
      ];
      const alvo = instante('2023-06-01 12:00:00+00');

      // Act
      const comAberturaInvalida = isEmExercicioFromIntervalos(
        aberturaInvalida,
        alvo,
      );
      const comFechamentoInvalido = isEmExercicioFromIntervalos(
        fechamentoInvalido,
        alvo,
      );

      // Assert
      expect(comAberturaInvalida).toBe(false);
      expect(comFechamentoInvalido).toBe(false);
    });
  });

  describe('when there are no intervals', () => {
    it('returns false', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [];

      // Act
      const emExercicio = isEmExercicioFromIntervalos(
        intervalos,
        instante('2023-06-01 12:00:00+00'),
      );

      // Assert
      expect(emExercicio).toBe(false);
    });
  });
});

describe('isEmAtividadeFromIntervalos', () => {
  describe('when there is an open-ended interval', () => {
    it('returns true', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01 12:00:00+00',
          closedAt: '2023-01-31 23:59:00+00',
        },
        { openedAt: '2023-02-01 12:00:00+00', closedAt: null },
      ];

      // Act
      const emAtividade = isEmAtividadeFromIntervalos(intervalos);

      // Assert
      expect(emAtividade).toBe(true);
    });
  });

  describe('when every interval is closed', () => {
    it('returns false', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [
        {
          openedAt: '2019-02-01 12:00:00+00',
          closedAt: '2023-01-31 23:59:00+00',
        },
      ];

      // Act
      const emAtividade = isEmAtividadeFromIntervalos(intervalos);

      // Assert
      expect(emAtividade).toBe(false);
    });
  });

  describe('when there are no intervals', () => {
    it('returns false', () => {
      // Arrange
      const intervalos: IntervaloExercicio[] = [];

      // Act
      const emAtividade = isEmAtividadeFromIntervalos(intervalos);

      // Assert
      expect(emAtividade).toBe(false);
    });
  });
});

describe('getPartidoVigente', () => {
  describe('when a party change happens during a Licença', () => {
    it('keeps the leave closed but updates the party in effect', () => {
      // Arrange
      const posse = evento({
        dataHora: '2019-02-01 12:00:00+00',
        partido: 'PARTIDO_A',
      });
      const licenca = evento({
        dataHora: '2020-08-01 12:00:00+00',
        situacao: 'Licença',
        descricaoStatus: 'Licença para tratar de interesses particulares',
        partido: 'PARTIDO_A',
      });
      const alteracao = evento({
        dataHora: '2020-09-15 09:00:00+00',
        situacao: 'Licença',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_B',
      });
      const eventos = [posse, licenca, alteracao];

      // Act
      const emExercicio = isEmExercicio(eventos, '2020-10-01 12:00:00+00');
      const partido = getPartidoVigente(eventos, '2020-10-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(false);
      expect(partido).toBe('PARTIDO_B');
    });
  });

  describe('when a party change happens while the deputy is in office', () => {
    it('keeps the interval open and updates the party in effect', () => {
      // Arrange
      const posse = evento({
        dataHora: '2023-02-01 12:00:00+00',
        descricaoStatus: 'Entrada - Posse de Eleito Titular',
        partido: 'PARTIDO_A',
      });
      const alteracao = evento({
        dataHora: '2024-03-10 09:00:00+00',
        situacao: 'Exercício',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_B',
      });
      const eventos = [posse, alteracao];

      // Act
      const emExercicio = isEmExercicio(eventos, '2024-06-01 12:00:00+00');
      const partido = getPartidoVigente(eventos, '2024-06-01 12:00:00+00');

      // Assert
      expect(emExercicio).toBe(true);
      expect(partido).toBe('PARTIDO_B');
    });
  });

  describe('when the party changes are given out of chronological order', () => {
    it('takes the latest change up to the instant, not the last in the array', () => {
      // Arrange
      const posse = evento({
        dataHora: '2023-02-01 12:00:00+00',
        partido: 'PARTIDO_A',
      });
      const recente = evento({
        dataHora: '2024-03-10 09:00:00+00',
        situacao: 'Exercício',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_B',
      });
      const antigo = evento({
        dataHora: '2023-05-10 09:00:00+00',
        situacao: 'Exercício',
        descricaoStatus: 'Alteração de partido',
        partido: 'PARTIDO_C',
      });

      // Act
      const partido = getPartidoVigente(
        [posse, recente, antigo],
        '2024-06-01 12:00:00+00',
      );

      // Assert
      expect(partido).toBe('PARTIDO_B');
    });
  });
});
