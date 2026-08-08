import type {
  ProposicaoVotacaoJoinRow,
  ProposicoesFeedQuery,
  ProposicoesRepository,
} from '../proposicoes.repository';
import { ProposicoesService } from '../proposicoes.service';
import { toProposicoesComputaveis } from '../rules/proposicoes-computaveis';

function joinRow(
  overrides: Partial<ProposicaoVotacaoJoinRow> = {},
): ProposicaoVotacaoJoinRow {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre algo',
    descricaoTipo: 'Projeto de Lei',
    ementaDetalhada: 'Detalha o alcance da proposição.',
    keywords: 'Saúde, regra pública.',
    urlInteiroTeor: null,
    dataApresentacao: '2024-04-15T10:00:00Z',
    ultimoStatusSiglaOrgao: 'PLEN',
    ultimoStatusDescricaoSituacao: 'Aprovada',
    ultimoStatusRegime: 'Urgência',
    ultimoStatusDataHora: '2024-06-01T10:00:00Z',
    externalIdVotacao: '1-1',
    data: '2024-05-01',
    dataHoraRegistro: '2024-05-01T12:00:00Z',
    descricao: 'Aprovado o Projeto de Lei',
    ultimaAberturaVotacaoDescricao: null,
    ultimaApresentacaoProposicaoDescricao: null,
    votosSim: 300,
    votosNao: 100,
    votosOutros: 5,
    aprovacao: 1,
    resumoIa: null,
    ...overrides,
  };
}

// Ordenacao e paginacao sao do SQL; o fake devolve o conjunto como veio e
// registra o que foi pedido. O que resta de comportamento do service e a
// traducao da requisicao em query e a busca textual, que segue em JS.
const feedCalls: ProposicoesFeedQuery[] = [];

function fakeRepository(
  rows: readonly ProposicaoVotacaoJoinRow[],
  total?: number,
): ProposicoesRepository {
  const items = toProposicoesComputaveis(rows);
  return {
    loadProposicoesComputaveis: async (query) => {
      feedCalls.push(query);
      return { items, total: total ?? items.length };
    },
    loadComputableExternalIds: async () =>
      items.map((r) => r.proposicao.externalIdProposicao),
    loadProposicaoDetalhe: async () => null,
    loadProposicaoTemas: async () => [],
  };
}

function createService(
  rows: readonly ProposicaoVotacaoJoinRow[],
  total?: number,
) {
  feedCalls.length = 0;
  return new ProposicoesService(fakeRepository(rows, total));
}

describe('ProposicoesService.feed', () => {
  describe('when a proposicao has a classifiable plenary vote', () => {
    it('returns a card with proposicao identity and voting aggregates', async () => {
      // Arrange
      const service = createService([joinRow()]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.total).toBe(1);
      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toEqual({
        externalIdProposicao: 1,
        siglaTipo: 'PL',
        numero: 100,
        ano: 2024,
        ementa: 'Dispõe sobre algo',
        resumoIaDisponivel: false,
        resumoIaCard: null,
        dataApresentacao: '2024-04-15T10:00:00Z',
        volumeVotacoesPlenario: 1,
        dataUltimaVotacao: '2024-05-01',
      });
    });

    it('returns the approved current resumo on the card', async () => {
      // Arrange
      const service = createService([
        joinRow({
          resumoIa: {
            sourceHash:
              '2d858cf88d85da4dd90b74171d94850d0737dcb32c43129a0ac191ccc6515906',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto aprovado.',
            resumoDetalhe: 'Resumo detalhado aprovado em linguagem acessivel.',
          },
        }),
      ]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items[0]).toMatchObject({
        ementa: 'Dispõe sobre algo',
        resumoIaDisponivel: true,
        resumoIaCard: 'Resumo curto aprovado.',
      });
    });

    it('keeps the ementa fallback when the resumo is not public', async () => {
      // Arrange
      const service = createService([
        joinRow({
          resumoIa: {
            sourceHash:
              '2d858cf88d85da4dd90b74171d94850d0737dcb32c43129a0ac191ccc6515906',
            generationStatus: 'generated',
            reviewStatus: 'pending',
            resumoCard: 'Resumo curto pendente.',
            resumoDetalhe: 'Resumo detalhado pendente.',
          },
        }),
      ]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items[0]).toMatchObject({
        ementa: 'Dispõe sobre algo',
        resumoIaDisponivel: false,
        resumoIaCard: null,
      });
    });
  });

  describe('when a proposicao has plenary votes but none is classifiable', () => {
    it('excludes it (not computavel pelo matcher)', async () => {
      // Arrange
      const computavel = joinRow({
        externalIdProposicao: 1,
        descricao: 'Aprovado o Projeto de Lei',
      });
      const naoComputavel = joinRow({
        externalIdProposicao: 2,
        descricao: 'Requerimento de retirada de pauta',
      });
      const service = createService([computavel, naoComputavel]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.total).toBe(1);
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([1]);
    });
  });

  describe('when the feed is not a text search', () => {
    it('asks the repository for the ordered, paginated page', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdVotacao: '1-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      await service.feed(2, 40, 'mais-recentes', 34);

      // Assert
      expect(feedCalls).toEqual([
        {
          ordenacao: 'mais-recentes',
          tema: 34,
          pagination: { limit: 2, offset: 40 },
        },
      ]);
    });

    it('reports the total the repository computed, not the page length', async () => {
      // Arrange
      const service = createService(
        [
          joinRow({
            externalIdVotacao: '1-1',
            descricao: 'Aprovado o Projeto de Lei',
          }),
        ],
        512,
      );

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.total).toBe(512);
      expect(page.items).toHaveLength(1);
    });

    it('keeps the page in the order the repository returned it', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 7,
          externalIdVotacao: '7-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
        joinRow({
          externalIdProposicao: 3,
          externalIdVotacao: '3-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        7, 3,
      ]);
    });
  });
});

describe('ProposicoesService.temasDisponiveis', () => {
  describe('when deriving which temas are available', () => {
    it('uses the lean computable-id source, not the full computaveis payload', async () => {
      // Arrange
      const service = new ProposicoesService({
        loadProposicoesComputaveis: async () => {
          throw new Error('should not load the full computaveis payload');
        },
        loadComputableExternalIds: async () => [1],
        loadProposicaoDetalhe: async () => null,
        loadProposicaoTemas: async () => [
          { externalIdProposicao: 1, externalCodTema: 30, tema: 'Saúde' },
          { externalIdProposicao: 2, externalCodTema: 10, tema: 'Educação' },
        ],
      });

      // Act
      const result = await service.temasDisponiveis();

      // Assert
      expect(result.items.map((t) => t.externalCodTema)).toEqual([30]);
    });
  });
});

describe('ProposicoesService.feed with text query', () => {
  describe('when a query matches by ementa', () => {
    it('returns only the matching computavel card', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 1,
          ementa: 'Dispõe sobre saúde pública',
          descricao: 'Aprovado o Projeto de Lei',
        }),
        joinRow({
          externalIdProposicao: 2,
          ementa: 'Dispõe sobre educação',
          descricao: 'Aprovado o Projeto de Lei',
          externalIdVotacao: '2-1',
        }),
      ]);

      // Act
      const result = await service.feed(
        20,
        0,
        'mais-votadas',
        undefined,
        'saúde',
      );

      // Assert
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        1,
      ]);
    });
  });

  describe('when a query matches by legislative identifier', () => {
    it.each([
      ['siglaTipo', 'PL'],
      ['numero', '1234'],
      ['ano', '2024'],
    ])('finds the proposicao by its %s', async (_field, term) => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 7,
          siglaTipo: 'PL',
          numero: 1234,
          ano: 2024,
          ementa: 'Texto qualquer',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.feed(20, 0, 'mais-votadas', undefined, term);

      // Assert
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        7,
      ]);
    });
  });

  describe('when the query is a citation', () => {
    it('returns only the exact match, excluding ementa coincidences', async () => {
      // Arrange
      const target = joinRow({
        externalIdProposicao: 10,
        siglaTipo: 'PEC',
        numero: 3,
        ano: 2021,
        ementa: 'Altera a Constituição Federal',
        externalIdVotacao: '10-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const ementaCoincidence = joinRow({
        externalIdProposicao: 11,
        siglaTipo: 'PL',
        numero: 100,
        ano: 2020,
        ementa: 'Texto sobre 3 espécies vegetais publicado em 2021',
        externalIdVotacao: '11-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const service = createService([target, ementaCoincidence]);

      // Act
      const result = await service.feed(
        20,
        0,
        'mais-votadas',
        undefined,
        'pec 3/2021',
      );

      // Assert
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        10,
      ]);
    });
  });

  describe('when a query is combined with a tema', () => {
    it('returns only items that match both the query and the tema', async () => {
      // Arrange: same as the fakeRepository setup requires tema rows to be present
      // Since the service delegates tema filtering to the repository, the repository
      // already filters by tema before the service applies q.
      // Here we simulate the repo returning only tema-filtered rows.
      const matched = joinRow({
        externalIdProposicao: 1,
        ementa: 'Dispõe sobre saúde pública',
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const service = createService([matched]);

      // Act
      const result = await service.feed(20, 0, 'mais-votadas', 10, 'saúde');

      // Assert
      expect(result.total).toBe(1);
      expect(result.items[0].externalIdProposicao).toBe(1);
    });
  });

  describe('when a query is combined with ordenacao', () => {
    it('asks the repository for the whole ordered set, without pagination', async () => {
      // Arrange
      const service = createService([
        joinRow({
          ementa: 'Dispõe sobre saúde',
          externalIdVotacao: '1-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      await service.feed(20, 0, 'mais-recentes', 10, 'saúde');

      // Assert
      // A busca filtra em JS depois, entao paginar no SQL cortaria candidatos
      // antes do filtro; a ordenacao continua vindo pronta do banco.
      expect(feedCalls).toEqual([
        { ordenacao: 'mais-recentes', tema: 10, pagination: undefined },
      ]);
    });

    it('keeps the repository order among the filtered matches', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 1,
          ementa: 'Dispõe sobre saúde',
          externalIdVotacao: '1-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
        joinRow({
          externalIdProposicao: 99,
          ementa: 'Sobre educação',
          externalIdVotacao: '99-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
        joinRow({
          externalIdProposicao: 2,
          ementa: 'Dispõe sobre saúde',
          externalIdVotacao: '2-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.feed(
        20,
        0,
        'mais-recentes',
        undefined,
        'saúde',
      );

      // Assert
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        1, 2,
      ]);
    });
  });

  describe('when the query is empty', () => {
    it('returns all computavel items without filtering', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 1,
          externalIdVotacao: '1-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
        joinRow({
          externalIdProposicao: 2,
          externalIdVotacao: '2-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.feed(20, 0, 'mais-votadas', undefined, '');

      // Assert
      expect(result.total).toBe(2);
    });
  });

  describe('pagination with q filter', () => {
    function fourMatchesWithSaude() {
      return [2024, 2023, 2022, 2021].map((ano, index) =>
        joinRow({
          externalIdProposicao: index + 1,
          ano,
          numero: index + 1,
          ementa: 'Dispõe sobre saúde',
          externalIdVotacao: `${index + 1}-1`,
          descricao: 'Aprovado o Projeto de Lei',
        }),
      );
    }

    it('slices after filter and reports the filtered total', async () => {
      // Arrange
      const rows = [
        ...fourMatchesWithSaude(),
        joinRow({
          externalIdProposicao: 99,
          ementa: 'Sobre educação',
          externalIdVotacao: '99-1',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ];
      const service = createService(rows);

      // Act
      const result = await service.feed(
        2,
        1,
        'mais-votadas',
        undefined,
        'saúde',
      );

      // Assert
      expect(result.total).toBe(4);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
      expect(result.items).toHaveLength(2);
    });
  });
});
