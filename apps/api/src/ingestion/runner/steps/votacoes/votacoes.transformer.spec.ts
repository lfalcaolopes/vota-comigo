import { deriveEscopoVotacao, toVotacaoRow } from './votacoes.transformer';
import type { CsvRecord } from '../../csv-reader';

function votacaoRecord(overrides: CsvRecord = {}): CsvRecord {
  return {
    id: '2236343-24',
    uri: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/2236343-24',
    data: '2020-02-04',
    dataHoraRegistro: '2020-02-04T19:39:25',
    idOrgao: '180',
    uriOrgao: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/180',
    siglaOrgao: 'PLEN',
    idEvento: '60500',
    uriEvento: 'https://dadosabertos.camara.leg.br/api/v2/eventos/60500',
    aprovacao: '1',
    votosSim: '300',
    votosNao: '120',
    votosOutros: '3',
    descricao: 'Aprovado requerimento de urgencia.',
    ultimaAberturaVotacao_dataHoraRegistro: '2020-02-04T19:30:00',
    ultimaAberturaVotacao_descricao: 'Abertura da votacao do requerimento.',
    ultimaApresentacaoProposicao_dataHoraRegistro: '2020-02-04T18:00:00',
    ultimaApresentacaoProposicao_descricao: 'Apresentacao do PL 23/2020.',
    ultimaApresentacaoProposicao_idProposicao: '2235643',
    ultimaApresentacaoProposicao_uriProposicao:
      'https://dadosabertos.camara.leg.br/api/v2/proposicoes/2235643',
    ...overrides,
  };
}

describe('votacoes transformer', () => {
  describe('when deriving escopo_votacao from siglaOrgao', () => {
    it('resolves plenario for the plenary chambers PLEN and CN', () => {
      // Arrange / Act / Assert
      expect(deriveEscopoVotacao('PLEN')).toBe('plenario');
      expect(deriveEscopoVotacao('CN')).toBe('plenario');
    });

    it('resolves comissao for any other siglaOrgao', () => {
      // Arrange / Act / Assert
      expect(deriveEscopoVotacao('CCJC')).toBe('comissao');
      expect(deriveEscopoVotacao('CFT')).toBe('comissao');
    });

    it('resolves comissao when siglaOrgao is missing', () => {
      // Arrange / Act / Assert
      expect(deriveEscopoVotacao(null)).toBe('comissao');
      expect(deriveEscopoVotacao('')).toBe('comissao');
    });
  });

  describe('when mapping a votacoes CSV record to a row', () => {
    it('persists the local texts, placar and derived escopo', () => {
      // Arrange
      const record = votacaoRecord();

      // Act
      const row = toVotacaoRow(record);

      // Assert
      expect(row).toEqual({
        externalIdVotacao: '2236343-24',
        uri: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/2236343-24',
        data: '2020-02-04',
        dataHoraRegistro: '2020-02-04T19:39:25',
        externalIdOrgao: 180,
        siglaOrgao: 'PLEN',
        escopoVotacao: 'plenario',
        externalIdEvento: 60500,
        aprovacao: 1,
        votosSim: 300,
        votosNao: 120,
        votosOutros: 3,
        descricao: 'Aprovado requerimento de urgencia.',
        ultimaAberturaVotacaoDataHoraRegistro: '2020-02-04T19:30:00',
        ultimaAberturaVotacaoDescricao: 'Abertura da votacao do requerimento.',
        ultimaApresentacaoProposicaoDataHoraRegistro: '2020-02-04T18:00:00',
        ultimaApresentacaoProposicaoDescricao: 'Apresentacao do PL 23/2020.',
        externalIdProposicaoUltimaApresentacao: 2235643,
        uriProposicaoUltimaApresentacao:
          'https://dadosabertos.camara.leg.br/api/v2/proposicoes/2235643',
      });
    });

    it('derives comissao escopo from a committee siglaOrgao', () => {
      // Arrange
      const record = votacaoRecord({ siglaOrgao: 'CCJC' });

      // Act
      const row = toVotacaoRow(record);

      // Assert
      expect(row.escopoVotacao).toBe('comissao');
    });

    it('normalizes empty source fields to null and keeps the proposicao reference external', () => {
      // Arrange
      const record = votacaoRecord({
        votosSim: '',
        votosNao: '',
        votosOutros: '',
        descricao: '',
        ultimaAberturaVotacao_descricao: '',
        ultimaApresentacaoProposicao_idProposicao: '',
        ultimaApresentacaoProposicao_uriProposicao: '',
      });

      // Act
      const row = toVotacaoRow(record);

      // Assert
      expect(row).toMatchObject({
        votosSim: null,
        votosNao: null,
        votosOutros: null,
        descricao: null,
        ultimaAberturaVotacaoDescricao: null,
        externalIdProposicaoUltimaApresentacao: null,
        uriProposicaoUltimaApresentacao: null,
      });
    });
  });
});
