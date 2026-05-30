import { normalizeVotacaoVotoRecord } from './votacoes-votos.normalizer';

const baseRecord = {
  idVotacao: '1197773-140',
  uriVotacao: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/1197773-140',
  dataHoraVoto: '2024-12-04T21:10:04',
  voto: 'Não',
  deputado_id: '204379',
  deputado_uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
  deputado_nome: 'Acácio Favacho',
  deputado_siglaPartido: 'MDB',
  deputado_uriPartido:
    'https://dadosabertos.camara.leg.br/api/v2/partidos/36899',
  deputado_siglaUf: 'AP',
  deputado_idLegislatura: '57',
  deputado_urlFoto:
    'https://www.camara.leg.br/internet/deputado/bandep/204379.jpg',
};

describe('normalizeVotacaoVotoRecord', () => {
  describe('when the record has a complete vote line', () => {
    it('maps the vote identifiers and the raw vote', () => {
      // Act
      const normalized = normalizeVotacaoVotoRecord(baseRecord);

      // Assert
      expect(normalized).toMatchObject({
        idVotacao: '1197773-140',
        uriVotacao:
          'https://dadosabertos.camara.leg.br/api/v2/votacoes/1197773-140',
        dataHoraVoto: '2024-12-04T21:10:04',
        voto: 'Não',
      });
    });

    it('maps the deputado block with the external id taken from the uri', () => {
      // Act
      const { deputado } = normalizeVotacaoVotoRecord(baseRecord);

      // Assert
      expect(deputado).toMatchObject({
        externalId: 204379,
        nome: 'Acácio Favacho',
        siglaUf: 'AP',
        idLegislatura: 57,
      });
    });
  });

  describe('partido observation', () => {
    it('observes the partido with id, sigla and uri', () => {
      // Act
      const { partido } = normalizeVotacaoVotoRecord(baseRecord);

      // Assert
      expect(partido).toEqual({
        status: 'observed',
        externalIdPartido: 36899,
        sigla: 'MDB',
        uri: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36899',
      });
    });

    it('reports the partido as absent when uriPartido is empty', () => {
      // Arrange
      const record = { ...baseRecord, deputado_uriPartido: '' };

      // Act
      const { partido } = normalizeVotacaoVotoRecord(record);

      // Assert
      expect(partido).toEqual({ status: 'absent' });
    });

    it('reports the partido as invalid when uriPartido has no numeric id', () => {
      // Arrange
      const record = {
        ...baseRecord,
        deputado_uriPartido:
          'https://dadosabertos.camara.leg.br/api/v2/partidos/sem-id',
      };

      // Act
      const { partido } = normalizeVotacaoVotoRecord(record);

      // Assert
      expect(partido).toEqual({
        status: 'invalid',
        uri: 'https://dadosabertos.camara.leg.br/api/v2/partidos/sem-id',
      });
    });
  });
});
