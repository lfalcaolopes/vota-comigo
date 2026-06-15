import type {
  ProposicaoVotacaoJoinRow,
  ProposicoesRepository,
} from '../proposicoes.repository';
import { ProposicoesService } from '../proposicoes.service';

function joinRow(
  overrides: Partial<ProposicaoVotacaoJoinRow> = {},
): ProposicaoVotacaoJoinRow {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre algo',
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
    ...overrides,
  };
}

function fakeRepository(
  rows: readonly ProposicaoVotacaoJoinRow[],
): ProposicoesRepository {
  return {
    loadProposicoesWithVotacoesPlenario: async () => rows,
    loadProposicaoDetalhe: async () => null,
  };
}

function createService(rows: readonly ProposicaoVotacaoJoinRow[]) {
  return new ProposicoesService(fakeRepository(rows));
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
        dataApresentacao: '2024-04-15T10:00:00Z',
        volumeVotacoesPlenario: 1,
        dataUltimaVotacao: '2024-05-01',
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

  describe('when ordering by mais recentes', () => {
    it('orders by dataApresentacao descending instead of by volume', async () => {
      // Arrange: id=2 has more votes but older date; id=1 has fewer votes but newer date
      const newerFewVotes = joinRow({
        externalIdProposicao: 1,
        dataApresentacao: '2024-06-01T00:00:00Z',
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const olderManyVotesA = joinRow({
        externalIdProposicao: 2,
        dataApresentacao: '2022-03-10T00:00:00Z',
        externalIdVotacao: '2-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const olderManyVotesB = joinRow({
        externalIdProposicao: 2,
        dataApresentacao: '2022-03-10T00:00:00Z',
        externalIdVotacao: '2-2',
        descricao: 'Aprovada a Medida Provisória',
      });
      const service = createService([
        olderManyVotesA,
        olderManyVotesB,
        newerFewVotes,
      ]);

      // Act
      const page = await service.feed(20, 0, 'mais-recentes');

      // Assert: id=1 first because newer date, even though id=2 has more votes
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        1, 2,
      ]);
    });

    it('puts proposicoes without dataApresentacao at the end', async () => {
      // Arrange
      const withDate = joinRow({
        externalIdProposicao: 1,
        dataApresentacao: '2023-01-01T00:00:00Z',
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const nullDateHighVolume = joinRow({
        externalIdProposicao: 2,
        dataApresentacao: null,
        externalIdVotacao: '2-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const service = createService([nullDateHighVolume, withDate]);

      // Act
      const page = await service.feed(20, 0, 'mais-recentes');

      // Assert: id=1 first because it has a date; id=2 goes last despite higher tie-break id
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        1, 2,
      ]);
    });
  });

  describe('when ranking computable proposicoes', () => {
    it('orders by volume of plenary votes descending', async () => {
      // Arrange
      const umaVotacao = joinRow({
        externalIdProposicao: 1,
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const duasVotacoesA = joinRow({
        externalIdProposicao: 2,
        externalIdVotacao: '2-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const duasVotacoesB = joinRow({
        externalIdProposicao: 2,
        externalIdVotacao: '2-2',
        descricao: 'Aprovada a Medida Provisória',
      });
      const service = createService([umaVotacao, duasVotacoesA, duasVotacoesB]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        2, 1,
      ]);
      expect(page.items[0].volumeVotacoesPlenario).toBe(2);
      expect(page.items[0].dataUltimaVotacao).toBe('2024-05-01');
    });

    it('breaks volume ties by ano desc, numero desc, siglaTipo asc, externalId asc', async () => {
      // Arrange
      const base = { descricao: 'Aprovado o Projeto de Lei' } as const;
      const rows = [
        joinRow({
          externalIdProposicao: 10,
          ano: 2023,
          numero: 5,
          siglaTipo: 'PL',
          externalIdVotacao: 'a',
          ...base,
        }),
        joinRow({
          externalIdProposicao: 11,
          ano: 2024,
          numero: 5,
          siglaTipo: 'PL',
          externalIdVotacao: 'b',
          ...base,
        }),
        joinRow({
          externalIdProposicao: 12,
          ano: 2024,
          numero: 9,
          siglaTipo: 'PL',
          externalIdVotacao: 'c',
          ...base,
        }),
      ];
      const service = createService(rows);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        12, 11, 10,
      ]);
    });
  });

  describe('pagination', () => {
    function threeComputaveis() {
      return [2024, 2023, 2022].map((ano, index) =>
        joinRow({
          externalIdProposicao: index + 1,
          ano,
          externalIdVotacao: `${index + 1}-1`,
          descricao: 'Aprovado o Projeto de Lei',
        }),
      );
    }

    it('slices by limit and offset while reporting the full total', async () => {
      // Arrange
      const service = createService(threeComputaveis());

      // Act
      const page = await service.feed(2, 1);

      // Assert
      expect(page.total).toBe(3);
      expect(page.limit).toBe(2);
      expect(page.offset).toBe(1);
      expect(page.items).toHaveLength(2);
    });

    it('returns an empty page when offset is beyond the total', async () => {
      // Arrange
      const service = createService(threeComputaveis());

      // Act
      const page = await service.feed(20, 99);

      // Assert
      expect(page.total).toBe(3);
      expect(page.items).toEqual([]);
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
      const result = await service.feed(20, 0, 'mais-votadas', undefined, 'saúde');

      // Assert
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([1]);
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
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([7]);
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
      const result = await service.feed(20, 0, 'mais-votadas', undefined, 'pec 3/2021');

      // Assert
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([10]);
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
      const service = new ProposicoesService({
        loadProposicoesWithVotacoesPlenario: async () => [matched],
        loadProposicaoDetalhe: async () => null,
        loadProposicaoTemas: async () => [],
      });

      // Act
      const result = await service.feed(20, 0, 'mais-votadas', 10, 'saúde');

      // Assert
      expect(result.total).toBe(1);
      expect(result.items[0].externalIdProposicao).toBe(1);
    });
  });

  describe('when a query is combined with ordenacao', () => {
    it('orders results by ordenacao, not by search relevance', async () => {
      // Arrange: id=1 newer, id=2 has more votes but older
      const newer = joinRow({
        externalIdProposicao: 1,
        ementa: 'Dispõe sobre saúde',
        dataApresentacao: '2024-06-01T00:00:00Z',
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const olderMoreVotesA = joinRow({
        externalIdProposicao: 2,
        ementa: 'Dispõe sobre saúde',
        dataApresentacao: '2022-01-01T00:00:00Z',
        externalIdVotacao: '2-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const olderMoreVotesB = joinRow({
        externalIdProposicao: 2,
        ementa: 'Dispõe sobre saúde',
        dataApresentacao: '2022-01-01T00:00:00Z',
        externalIdVotacao: '2-2',
        descricao: 'Aprovada a Medida Provisória',
      });
      const service = createService([newer, olderMoreVotesA, olderMoreVotesB]);

      // Act
      const result = await service.feed(20, 0, 'mais-recentes', undefined, 'saúde');

      // Assert: ordered by date not by volume
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([1, 2]);
    });
  });

  describe('when the query is empty', () => {
    it('returns all computavel items without filtering', async () => {
      // Arrange
      const service = createService([
        joinRow({ externalIdProposicao: 1, externalIdVotacao: '1-1', descricao: 'Aprovado o Projeto de Lei' }),
        joinRow({ externalIdProposicao: 2, externalIdVotacao: '2-1', descricao: 'Aprovado o Projeto de Lei' }),
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
      const result = await service.feed(2, 1, 'mais-votadas', undefined, 'saúde');

      // Assert
      expect(result.total).toBe(4);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
      expect(result.items).toHaveLength(2);
    });
  });
});
