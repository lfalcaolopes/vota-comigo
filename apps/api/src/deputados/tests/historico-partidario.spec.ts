import type { DeputadoSnapshotPublico } from '@vota-comigo/shared-types';

import { deriveHistoricoPartidario } from '../rules/historico-partidario';
import type { DeputadoHistoricoEventoSource } from '../types/deputados.types';

function evento(
  overrides: Partial<DeputadoHistoricoEventoSource> = {},
): DeputadoHistoricoEventoSource {
  return {
    dataHora: '2021-02-01T00:00:00+00:00',
    situacao: 'Exercício',
    descricaoStatus: 'Exercício',
    nomeEleitoral: 'Maria da Silva',
    siglaPartido: 'PT',
    siglaUf: 'SP',
    urlFoto: null,
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<DeputadoSnapshotPublico> = {},
): DeputadoSnapshotPublico {
  return {
    nomeEleitoral: 'Maria da Silva',
    siglaPartido: 'PT',
    siglaUf: 'SP',
    urlFoto: null,
    ...overrides,
  };
}

describe('deriveHistoricoPartidario', () => {
  describe('when there are no events with a resolved partido', () => {
    it('reports the historico as unavailable for an empty list', () => {
      // Act
      const result = deriveHistoricoPartidario({ eventos: [], snapshot: null });

      // Assert
      expect(result.historicoPartidarioDisponivel).toBe(false);
      expect(result.historicoPartidario).toEqual([]);
    });

    it('ignores events without a partido and reports unavailable', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-01-01T00:00:00+00:00', siglaPartido: null }),
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: null }),
      ];

      // Act
      const result = deriveHistoricoPartidario({ eventos, snapshot: null });

      // Assert
      expect(result.historicoPartidarioDisponivel).toBe(false);
      expect(result.historicoPartidario).toEqual([]);
    });
  });

  describe('when there are events with a resolved partido', () => {
    it('builds a single period for a single partido', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: 'PT' }),
      });

      // Assert
      expect(result.historicoPartidarioDisponivel).toBe(true);
      expect(result.historicoPartidario).toEqual([
        {
          siglaPartido: 'PT',
          dataInicio: '2021-02-01',
          dataFim: null,
          atual: true,
        },
      ]);
    });

    it('orders events ascending before grouping regardless of input order', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2023-01-01T00:00:00+00:00', siglaPartido: 'PSB' }),
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: 'PSB' }),
      });

      // Assert
      expect(result.historicoPartidario).toEqual([
        {
          siglaPartido: 'PSB',
          dataInicio: '2023-01-01',
          dataFim: null,
          atual: true,
        },
        {
          siglaPartido: 'PT',
          dataInicio: '2021-02-01',
          dataFim: '2023-01-01',
          atual: false,
        },
      ]);
    });

    it('groups consecutive events with the same partido into one period', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
        evento({ dataHora: '2021-08-01T00:00:00+00:00', siglaPartido: 'PT' }),
        evento({ dataHora: '2022-03-01T00:00:00+00:00', siglaPartido: 'PT' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: 'PT' }),
      });

      // Assert
      expect(result.historicoPartidario).toEqual([
        {
          siglaPartido: 'PT',
          dataInicio: '2021-02-01',
          dataFim: null,
          atual: true,
        },
      ]);
    });

    it('sets dataFim of a period to the start of the next period without subtracting a day', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2019-02-01T00:00:00+00:00', siglaPartido: 'MDB' }),
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
        evento({ dataHora: '2023-01-01T00:00:00+00:00', siglaPartido: 'PSB' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: 'PSB' }),
      });

      // Assert
      expect(result.historicoPartidario).toEqual([
        {
          siglaPartido: 'PSB',
          dataInicio: '2023-01-01',
          dataFim: null,
          atual: true,
        },
        {
          siglaPartido: 'PT',
          dataInicio: '2021-02-01',
          dataFim: '2023-01-01',
          atual: false,
        },
        {
          siglaPartido: 'MDB',
          dataInicio: '2019-02-01',
          dataFim: '2021-02-01',
          atual: false,
        },
      ]);
    });
  });

  describe('the atual flag on the most recent period', () => {
    it('marks the most recent period as atual when the snapshot partido matches', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
        evento({ dataHora: '2023-01-01T00:00:00+00:00', siglaPartido: 'PSB' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: 'PSB' }),
      });

      // Assert
      expect(result.historicoPartidario[0].atual).toBe(true);
    });

    it('does not mark the most recent period as atual when the snapshot has no partido', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
        evento({ dataHora: '2023-01-01T00:00:00+00:00', siglaPartido: 'PSB' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: null }),
      });

      // Assert
      expect(result.historicoPartidario[0].atual).toBe(false);
    });

    it('does not mark the most recent period as atual when the snapshot partido differs', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
        evento({ dataHora: '2023-01-01T00:00:00+00:00', siglaPartido: 'PSB' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({
        eventos,
        snapshot: snapshot({ siglaPartido: 'PT' }),
      });

      // Assert
      expect(result.historicoPartidario[0].atual).toBe(false);
    });

    it('does not mark any period as atual when there is no snapshot', () => {
      // Arrange
      const eventos = [
        evento({ dataHora: '2021-02-01T00:00:00+00:00', siglaPartido: 'PT' }),
      ];

      // Act
      const result = deriveHistoricoPartidario({ eventos, snapshot: null });

      // Assert
      expect(result.historicoPartidario[0].atual).toBe(false);
    });
  });
});
