import { deriveSnapshotPublico } from '../rules/snapshot-publico';
import type { DeputadoHistoricoEventoSource } from '../types/deputados.types';

function evento(
  overrides: Partial<DeputadoHistoricoEventoSource> = {},
): DeputadoHistoricoEventoSource {
  return {
    dataHora: '2023-01-01T00:00:00+00:00',
    situacao: 'Exercício',
    descricaoStatus: 'Exercício',
    nomeEleitoral: 'Maria da Silva',
    siglaPartido: 'PT',
    siglaUf: 'SP',
    urlFoto: 'https://example.com/foto.jpg',
    ...overrides,
  };
}

describe('deriveSnapshotPublico', () => {
  describe('when there are no events', () => {
    it('returns null', () => {
      // Arrange / Act
      const result = deriveSnapshotPublico([]);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('when there is one event', () => {
    it('returns a snapshot from that event', () => {
      // Arrange
      const eventos = [
        evento({
          nomeEleitoral: 'Maria da Silva',
          siglaPartido: 'PT',
          siglaUf: 'SP',
          urlFoto: 'https://example.com/foto.jpg',
        }),
      ];

      // Act
      const result = deriveSnapshotPublico(eventos);

      // Assert
      expect(result).toEqual({
        nomeEleitoral: 'Maria da Silva',
        siglaPartido: 'PT',
        siglaUf: 'SP',
        urlFoto: 'https://example.com/foto.jpg',
      });
    });
  });

  describe('when there are multiple events with different timestamps', () => {
    it('returns the snapshot from the event with the latest dataHora', () => {
      // Arrange
      const eventos = [
        evento({
          dataHora: '2021-03-01T00:00:00+00:00',
          nomeEleitoral: 'Maria Antiga',
          siglaPartido: 'MDB',
          siglaUf: 'RJ',
          urlFoto: null,
        }),
        evento({
          dataHora: '2023-06-15T10:00:00+00:00',
          nomeEleitoral: 'Maria da Silva',
          siglaPartido: 'PT',
          siglaUf: 'SP',
          urlFoto: 'https://example.com/foto.jpg',
        }),
        evento({
          dataHora: '2022-01-01T00:00:00+00:00',
          nomeEleitoral: 'Maria Meio',
          siglaPartido: 'PL',
          siglaUf: 'MG',
          urlFoto: null,
        }),
      ];

      // Act
      const result = deriveSnapshotPublico(eventos);

      // Assert
      expect(result?.nomeEleitoral).toBe('Maria da Silva');
      expect(result?.siglaPartido).toBe('PT');
      expect(result?.siglaUf).toBe('SP');
    });
  });

  describe('when some fields in the snapshot are null', () => {
    it('preserves null fields in the snapshot', () => {
      // Arrange
      const eventos = [
        evento({ nomeEleitoral: null, siglaPartido: null, urlFoto: null }),
      ];

      // Act
      const result = deriveSnapshotPublico(eventos);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.nomeEleitoral).toBeNull();
      expect(result?.siglaPartido).toBeNull();
      expect(result?.urlFoto).toBeNull();
    });
  });

  describe('when two events have the same dataHora', () => {
    it('returns the last one seen (stable tie-break)', () => {
      // Arrange
      const ts = '2023-01-01T00:00:00+00:00';
      const eventos = [
        evento({ dataHora: ts, nomeEleitoral: 'Primeiro', siglaPartido: 'PT' }),
        evento({ dataHora: ts, nomeEleitoral: 'Ultimo', siglaPartido: 'PL' }),
      ];

      // Act
      const result = deriveSnapshotPublico(eventos);

      // Assert
      expect(result?.nomeEleitoral).toBe('Ultimo');
    });
  });
});
