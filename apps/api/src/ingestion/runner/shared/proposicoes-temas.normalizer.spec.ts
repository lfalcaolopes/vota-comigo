import { normalizeProposicaoTemaRecord } from './proposicoes-temas.normalizer';
import type { CsvRecord } from '../csv-reader';

function record(overrides: CsvRecord = {}): CsvRecord {
  return {
    uriProposicao:
      'https://dadosabertos.camara.leg.br/api/v2/proposicoes/2267621',
    siglaTipo: 'PLP',
    numero: '266',
    ano: '2020',
    codTema: '34',
    tema: 'Administração Pública',
    relevancia: '0',
    ...overrides,
  };
}

describe('proposicoesTemas normalizer', () => {
  describe('when the theme row is complete', () => {
    it('extracts the proposicao external id from the uri and parses codTema', () => {
      // Arrange
      const csv = record();

      // Act
      const normalized = normalizeProposicaoTemaRecord(csv);

      // Assert
      expect(normalized).toEqual({
        externalIdProposicao: 2267621,
        codTema: 34,
        tema: 'Administração Pública',
      });
    });

    it('discards the relevancia field', () => {
      // Arrange
      const csv = record({ relevancia: '5' });

      // Act
      const normalized = normalizeProposicaoTemaRecord(csv);

      // Assert
      expect(normalized).not.toHaveProperty('relevancia');
    });
  });

  describe('when source fields are empty or malformed', () => {
    it('returns null for blank or non-numeric source fields', () => {
      // Arrange
      const csv = record({
        uriProposicao: '',
        codTema: '',
        tema: '',
      });

      // Act
      const normalized = normalizeProposicaoTemaRecord(csv);

      // Assert
      expect(normalized).toEqual({
        externalIdProposicao: null,
        codTema: null,
        tema: null,
      });
    });
  });
});
