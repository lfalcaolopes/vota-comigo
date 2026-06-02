import { transformVotacaoVotos } from './votacao-votos.transformer';
import type { NormalizedVotacaoVoto } from '../../shared/votacoes-votos.normalizer';

function voto(
  overrides: Partial<NormalizedVotacaoVoto> = {},
): NormalizedVotacaoVoto {
  return {
    idVotacao: '1197773-140',
    uriVotacao:
      'https://dadosabertos.camara.leg.br/api/v2/votacoes/1197773-140',
    dataHoraVoto: '2024-12-04T21:10:04',
    voto: 'Sim',
    deputado: {
      externalId: 204379,
      uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
      nome: 'Acacio Favacho',
      siglaUf: 'AP',
      idLegislatura: 57,
      urlFoto: null,
    },
    partido: { status: 'absent' },
    ...overrides,
  };
}

describe('transformVotacaoVotos', () => {
  describe('when aggregating votes for an ingested votacao', () => {
    it('groups internal deputado ids by category and persists scalar counts', async () => {
      // Arrange
      const rows = [
        { lineNumber: 2, voto: voto({ voto: 'Sim' }) },
        {
          lineNumber: 3,
          voto: voto({
            voto: 'Não',
            deputado: {
              ...voto().deputado,
              externalId: 204380,
            },
          }),
        },
        {
          lineNumber: 4,
          voto: voto({
            voto: 'Artigo 17',
            deputado: {
              ...voto().deputado,
              externalId: 204381,
            },
          }),
        },
      ];

      // Act
      const result = await transformVotacaoVotos({
        rows,
        sourceFile: 'votacoesVotos-2024.csv',
        votacaoIds: new Map([['1197773-140', 'votacao-uuid']]),
        deputadoIds: new Map([
          [204379, 'deputado-sim'],
          [204380, 'deputado-nao'],
          [204381, 'deputado-artigo-17'],
        ]),
      });

      // Assert
      expect(result).toMatchObject({ ignored: 0, rejected: [] });
      expect(result.rows).toEqual([
        {
          externalIdVotacao: '1197773-140',
          votacaoId: 'votacao-uuid',
          votosJson: {
            sim: ['deputado-sim'],
            nao: ['deputado-nao'],
            abstencao: [],
            obstrucao: [],
            artigo_17: ['deputado-artigo-17'],
            nao_informado: [],
          },
          votosSim: 1,
          votosNao: 1,
          votosAbstencao: 0,
          votosObstrucao: 0,
          votosArtigo17: 1,
          votosNaoInformado: 0,
        },
      ]);
    });
  });

  describe('when a vote has quality issues', () => {
    it('counts blank votes and reports unknown deputados without grouping them', async () => {
      // Arrange
      const rows = [
        { lineNumber: 2, voto: voto({ voto: null }) },
        {
          lineNumber: 3,
          voto: voto({
            voto: 'Sim',
            deputado: {
              ...voto().deputado,
              externalId: 999999,
              uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/999999',
            },
          }),
        },
      ];

      // Act
      const result = await transformVotacaoVotos({
        rows,
        sourceFile: 'votacoesVotos-2024.csv',
        votacaoIds: new Map([['1197773-140', 'votacao-uuid']]),
        deputadoIds: new Map([[204379, 'deputado-nao-informado']]),
      });

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        votosSim: 0,
        votosNaoInformado: 1,
      });
      expect(result.rows[0]?.votosJson.sim).toEqual([]);
      expect(result.rows[0]?.votosJson.nao_informado).toEqual([
        'deputado-nao-informado',
      ]);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        file: 'votacoesVotos-2024.csv',
        line: 3,
        type: 'deputado_externo_desconhecido',
      });
      expect(result.rejected[0]?.fields).toMatchObject({
        idVotacao: '1197773-140',
        idDeputado: '999999',
      });
    });
  });
});
