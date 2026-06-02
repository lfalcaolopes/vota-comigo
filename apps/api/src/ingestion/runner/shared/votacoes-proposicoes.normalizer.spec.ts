import { normalizeVotacaoProposicaoRecord } from './votacoes-proposicoes.normalizer';
import type { CsvRecord } from '../csv-reader';

function record(overrides: CsvRecord = {}): CsvRecord {
  return {
    idVotacao: '1006391-32',
    uriVotacao: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/1006391-32',
    data: '2024-02-20',
    descricao: 'Aprovado requerimento de urgencia.',
    proposicao_id: '1006391',
    proposicao_uri:
      'https://dadosabertos.camara.leg.br/api/v2/proposicoes/1006391',
    proposicao_titulo: 'PL 742/2015',
    proposicao_ementa: 'Dispoe sobre a obrigatoriedade de divulgacao.',
    proposicao_codTipo: '139',
    proposicao_siglaTipo: 'PL',
    proposicao_numero: '742',
    proposicao_ano: '2015',
    ...overrides,
  };
}

describe('votacoesProposicoes normalizer', () => {
  describe('when the link row is complete', () => {
    it('maps the canonical link and parses numeric source fields', () => {
      // Arrange
      const csv = record();

      // Act
      const normalized = normalizeVotacaoProposicaoRecord(csv);

      // Assert
      expect(normalized).toEqual({
        idVotacao: '1006391-32',
        proposicaoId: 1006391,
        proposicaoAno: 2015,
        siglaTipo: 'PL',
        codTipo: 139,
        numero: 742,
        titulo: 'PL 742/2015',
        ementa: 'Dispoe sobre a obrigatoriedade de divulgacao.',
      });
    });
  });

  describe('when numeric and text fields are empty', () => {
    it('returns null for blank source fields instead of empty strings', () => {
      // Arrange
      const csv = record({
        proposicao_id: '',
        proposicao_ano: '',
        proposicao_codTipo: '',
        proposicao_numero: '',
        proposicao_siglaTipo: '',
        proposicao_titulo: '',
        proposicao_ementa: '',
      });

      // Act
      const normalized = normalizeVotacaoProposicaoRecord(csv);

      // Assert
      expect(normalized).toEqual({
        idVotacao: '1006391-32',
        proposicaoId: null,
        proposicaoAno: null,
        siglaTipo: null,
        codTipo: null,
        numero: null,
        titulo: null,
        ementa: null,
      });
    });
  });
});
